import { Effect, Schema } from "effect";
import { Hono } from "hono";
import type { Context as HonoContext } from "hono";

import type { AuthInstance } from "./auth";
import { AuthService } from "./auth";
import { DatabasePool } from "./pool";
import {
  ApiKeyAlreadyExistsError,
  ApiKeyNotFoundError,
  AuthApiError,
  DatabaseQueryError,
  RequestValidationError,
  UnauthorizedError,
} from "./errors";
import { ToggleEnabledBodySchema, VerifyApiKeyBodySchema } from "./schemas";
import { AppLive } from "./layers";

const getAuthenticatedUser = (c: HonoContext) => {
  const user = c.get("user") as
    | { id: string; name: string; email: string; image: string | null }
    | null
    | undefined;
  if (!user) {
    return Effect.fail(new UnauthorizedError({ message: "Unauthorized" }));
  }
  return Effect.succeed(user);
};

const parseJsonBody = (c: HonoContext) =>
  Effect.tryPromise({
    try: () => c.req.json() as Promise<unknown>,
    catch: (error) =>
      new RequestValidationError({
        cause: error,
        message: "Invalid JSON body",
      }),
  });

const toApiKeyResponse = (
  key: {
    id: string;
    name: string | null;
    start: string | null;
    prefix: string | null;
    enabled: boolean;
    createdAt: Date;
  },
  value?: string,
) => ({
  id: key.id,
  name: key.name,
  start: key.start,
  prefix: key.prefix,
  enabled: key.enabled,
  createdAt: key.createdAt,
  ...(value !== undefined ? { value } : {}),
});

const listUserApiKeys = (auth: AuthInstance, headers: Headers) =>
  Effect.tryPromise({
    try: () => auth.api.listApiKeys({ headers }),
    catch: (error) => new AuthApiError({ cause: error, message: "Failed to list API keys" }),
  });

const createUserApiKey = (auth: AuthInstance, userId: string) =>
  Effect.tryPromise({
    try: () => auth.api.createApiKey({ body: { name: "default", userId } }),
    catch: (error) => new AuthApiError({ cause: error, message: "Failed to create API key" }),
  });

const deleteUserApiKey = (auth: AuthInstance, headers: Headers, keyId: string) =>
  Effect.tryPromise({
    try: () => auth.api.deleteApiKey({ body: { keyId }, headers }),
    catch: (error) =>
      new AuthApiError({
        cause: error,
        message: `Failed to delete API key ${keyId}`,
      }),
  });

const updateUserApiKey = (
  auth: AuthInstance,
  headers: Headers,
  keyId: string,
  data: { enabled: boolean },
) =>
  Effect.tryPromise({
    try: () => auth.api.updateApiKey({ body: { keyId, ...data }, headers }),
    catch: (error) => new AuthApiError({ cause: error, message: "Failed to update API key" }),
  });

const verifyApiKeyEffect = (auth: AuthInstance, key: string) =>
  Effect.tryPromise({
    try: () => auth.api.verifyApiKey({ body: { key } }),
    catch: (error) => new AuthApiError({ cause: error, message: "Failed to verify API key" }),
  });

const getUserProviders = (pool: InstanceType<typeof import("pg").Pool>, userId: string) =>
  Effect.tryPromise({
    try: () =>
      pool.query<{
        providers: string[] | null;
        disabledProviders: string[] | null;
      }>(`SELECT "providers", "disabledProviders" FROM "secrets" WHERE "userId" = $1`, [userId]),
    catch: (error) =>
      new DatabaseQueryError({
        cause: error,
        message: "Failed to query user providers",
      }),
  });

const apikeyRoute = new Hono().basePath("/apikey");

apikeyRoute.get("/", (c) =>
  Effect.gen(function* () {
    yield* getAuthenticatedUser(c);
    const auth = yield* AuthService;
    const result = yield* listUserApiKeys(auth, c.req.raw.headers);

    if (!result || result.length === 0) {
      return c.json({ key: null });
    }

    const key = result[0]!;
    return c.json({ key: toApiKeyResponse(key) });
  }).pipe(
    Effect.catchTags({
      UnauthorizedError: (err) => Effect.succeed(c.json({ error: err.message }, 401)),
      AuthApiError: (err) =>
        Effect.logError("GET /v1/apikey failed", { cause: err.cause }).pipe(
          Effect.as(c.json({ error: "Failed to fetch API key" }, 500)),
        ),
    }),
    Effect.provide(AppLive),
    Effect.runPromise,
  ),
);

apikeyRoute.post("/", (c) =>
  Effect.gen(function* () {
    const user = yield* getAuthenticatedUser(c);
    const auth = yield* AuthService;

    const existing = yield* listUserApiKeys(auth, c.req.raw.headers);
    if (existing && existing.length > 0) {
      return yield* new ApiKeyAlreadyExistsError({
        message: "API key already exists. Use regenerate to replace it.",
      });
    }

    const result = yield* createUserApiKey(auth, user.id);
    return c.json({ key: toApiKeyResponse(result, result.key) });
  }).pipe(
    Effect.catchTags({
      UnauthorizedError: (err) => Effect.succeed(c.json({ error: err.message }, 401)),
      ApiKeyAlreadyExistsError: (err) => Effect.succeed(c.json({ error: err.message }, 400)),
      AuthApiError: (err) =>
        Effect.logError("POST /v1/apikey failed", { cause: err.cause }).pipe(
          Effect.as(c.json({ error: "Failed to create API key" }, 500)),
        ),
    }),
    Effect.provide(AppLive),
    Effect.runPromise,
  ),
);

apikeyRoute.put("/", (c) =>
  Effect.gen(function* () {
    const { id: userId } = yield* getAuthenticatedUser(c);
    const auth = yield* AuthService;

    const existing = yield* listUserApiKeys(auth, c.req.raw.headers);

    if (existing && existing.length > 0) {
      yield* Effect.forEach(existing, (key) => deleteUserApiKey(auth, c.req.raw.headers, key.id), {
        concurrency: 1,
      });
    }

    const result = yield* createUserApiKey(auth, userId);
    return c.json({ key: toApiKeyResponse(result, result.key) });
  }).pipe(
    Effect.catchTags({
      UnauthorizedError: (err) => Effect.succeed(c.json({ error: err.message }, 401)),
      AuthApiError: (err) =>
        Effect.logError("PUT /v1/apikey failed", { cause: err.cause }).pipe(
          Effect.as(c.json({ error: "Failed to regenerate API key" }, 500)),
        ),
    }),
    Effect.provide(AppLive),
    Effect.runPromise,
  ),
);

apikeyRoute.patch("/", (c) =>
  Effect.gen(function* () {
    yield* getAuthenticatedUser(c);
    const auth = yield* AuthService;
    const raw = yield* parseJsonBody(c);

    const body = yield* Schema.decodeUnknown(ToggleEnabledBodySchema)(raw).pipe(
      Effect.mapError(
        (error) =>
          new RequestValidationError({
            cause: error,
            message: "Invalid body: requires { enabled: boolean }",
          }),
      ),
    );

    const existing = yield* listUserApiKeys(auth, c.req.raw.headers);
    if (!existing || existing.length === 0) {
      return yield* new ApiKeyNotFoundError({
        message: "No API key to update",
      });
    }

    const key = existing[0]!;
    const result = yield* updateUserApiKey(auth, c.req.raw.headers, key.id, {
      enabled: body.enabled,
    });

    return c.json({ key: toApiKeyResponse(result) });
  }).pipe(
    Effect.catchTags({
      UnauthorizedError: (err) => Effect.succeed(c.json({ error: err.message }, 401)),
      RequestValidationError: (err) => Effect.succeed(c.json({ error: err.message }, 400)),
      ApiKeyNotFoundError: (err) => Effect.succeed(c.json({ error: err.message }, 404)),
      AuthApiError: (err) =>
        Effect.logError("PATCH /v1/apikey failed", { cause: err.cause }).pipe(
          Effect.as(c.json({ error: "Failed to update API key" }, 500)),
        ),
    }),
    Effect.provide(AppLive),
    Effect.runPromise,
  ),
);

apikeyRoute.delete("/", (c) =>
  Effect.gen(function* () {
    yield* getAuthenticatedUser(c);
    const auth = yield* AuthService;

    const existing = yield* listUserApiKeys(auth, c.req.raw.headers);
    if (!existing || existing.length === 0) {
      return yield* new ApiKeyNotFoundError({
        message: "No API key to delete",
      });
    }

    yield* Effect.forEach(existing, (key) => deleteUserApiKey(auth, c.req.raw.headers, key.id), {
      concurrency: 1,
    });

    return c.json({ success: true });
  }).pipe(
    Effect.catchTags({
      UnauthorizedError: (err) => Effect.succeed(c.json({ error: err.message }, 401)),
      ApiKeyNotFoundError: (err) => Effect.succeed(c.json({ error: err.message }, 404)),
      AuthApiError: (err) =>
        Effect.logError("DELETE /v1/apikey failed", { cause: err.cause }).pipe(
          Effect.as(c.json({ error: "Failed to delete API key" }, 500)),
        ),
    }),
    Effect.provide(AppLive),
    Effect.runPromise,
  ),
);

apikeyRoute.post("/verify", (c) =>
  Effect.gen(function* () {
    const auth = yield* AuthService;
    const pool = yield* DatabasePool;
    const raw = yield* parseJsonBody(c);

    const body = yield* Schema.decodeUnknown(VerifyApiKeyBodySchema)(raw).pipe(
      Effect.mapError(
        (error) =>
          new RequestValidationError({
            cause: error,
            message: "Missing or invalid key",
          }),
      ),
    );

    const result = yield* verifyApiKeyEffect(auth, body.key);

    if (!result.valid) {
      return c.json({
        valid: false as const,
        error: result.error?.message ?? "Invalid API key",
      });
    }

    let providers: string[] = [];
    if (result.key?.userId) {
      const providerResult = yield* getUserProviders(pool, result.key.userId).pipe(
        Effect.catchTag("DatabaseQueryError", (err) =>
          Effect.logError("Failed to fetch user providers during verify").pipe(
            Effect.annotateLogs("cause", String(err.cause)),
            Effect.as({
              rows: [] as Array<{
                providers: string[] | null;
                disabledProviders: string[] | null;
              }>,
            }),
          ),
        ),
      );

      const allProviders = providerResult.rows[0]?.providers ?? [];
      const disabledProviders = providerResult.rows[0]?.disabledProviders ?? [];
      providers = allProviders.filter((p: string) => !disabledProviders.includes(p));
    }

    return c.json({
      valid: true as const,
      providers,
      userId: result.key?.userId,
    });
  }).pipe(
    Effect.catchTags({
      RequestValidationError: (err) =>
        Effect.succeed(c.json({ valid: false, error: err.message }, 400)),
      AuthApiError: (err) =>
        Effect.logError("POST /v1/apikey/verify failed", { cause: err.cause }).pipe(
          Effect.as(c.json({ valid: false, error: "Verification failed" }, 500)),
        ),
    }),
    Effect.provide(AppLive),
    Effect.runPromise,
  ),
);

export { apikeyRoute };
