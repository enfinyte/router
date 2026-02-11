import { Effect, Schema } from "effect";
import { Hono } from "hono";
import type { Context as HonoContext } from "hono";
import { addSecret, getSecret, deleteSecret } from "vault";

import { DatabasePool } from "./pool";
import {
  DatabaseQueryError,
  ProviderNotConfiguredError,
  RequestValidationError,
  UnauthorizedError,
} from "./errors";
import { CreateSecretBodySchema, ToggleEnabledBodySchema } from "./schemas";
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

const queryUserSecrets = (pool: InstanceType<typeof import("pg").Pool>, userId: string) =>
  Effect.tryPromise({
    try: () =>
      pool.query<{
        providers: string[] | null;
        disabledProviders: string[] | null;
      }>(`SELECT "providers", "disabledProviders" FROM "secrets" WHERE "userId" = $1`, [userId]),
    catch: (error) =>
      new DatabaseQueryError({
        cause: error,
        message: "Failed to query secrets",
      }),
  });

const queryUserProviderList = (pool: InstanceType<typeof import("pg").Pool>, userId: string) =>
  Effect.tryPromise({
    try: () =>
      pool.query<{ providers: string[] | null }>(
        `SELECT "providers" FROM "secrets" WHERE "userId" = $1`,
        [userId],
      ),
    catch: (error) =>
      new DatabaseQueryError({
        cause: error,
        message: "Failed to query providers",
      }),
  });

const upsertProvider = (
  pool: InstanceType<typeof import("pg").Pool>,
  userId: string,
  provider: string,
) =>
  Effect.tryPromise({
    try: () =>
      pool.query(
        `INSERT INTO "secrets" ("userId", "providers", "updatedAt")
         VALUES ($1, ARRAY[$2]::text[], CURRENT_TIMESTAMP)
         ON CONFLICT ("userId")
         DO UPDATE SET
           "providers" = CASE
             WHEN $2 = ANY("secrets"."providers") THEN "secrets"."providers"
             ELSE array_append("secrets"."providers", $2)
           END,
           "updatedAt" = CURRENT_TIMESTAMP`,
        [userId, provider],
      ),
    catch: (error) =>
      new DatabaseQueryError({
        cause: error,
        message: "Failed to upsert provider",
      }),
  });

const enableProvider = (
  pool: InstanceType<typeof import("pg").Pool>,
  userId: string,
  provider: string,
) =>
  Effect.tryPromise({
    try: () =>
      pool.query(
        `UPDATE "secrets"
         SET "disabledProviders" = array_remove("disabledProviders", $2),
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "userId" = $1`,
        [userId, provider],
      ),
    catch: (error) =>
      new DatabaseQueryError({
        cause: error,
        message: "Failed to enable provider",
      }),
  });

const disableProvider = (
  pool: InstanceType<typeof import("pg").Pool>,
  userId: string,
  provider: string,
) =>
  Effect.tryPromise({
    try: () =>
      pool.query(
        `UPDATE "secrets"
         SET "disabledProviders" = CASE
           WHEN $2 = ANY("disabledProviders") THEN "disabledProviders"
           ELSE array_append(COALESCE("disabledProviders", '{}'), $2)
         END,
         "updatedAt" = CURRENT_TIMESTAMP
         WHERE "userId" = $1`,
        [userId, provider],
      ),
    catch: (error) =>
      new DatabaseQueryError({
        cause: error,
        message: "Failed to disable provider",
      }),
  });

const removeProvider = (
  pool: InstanceType<typeof import("pg").Pool>,
  userId: string,
  provider: string,
) =>
  Effect.tryPromise({
    try: () =>
      pool.query(
        `UPDATE "secrets"
         SET "providers" = array_remove("providers", $2),
             "updatedAt" = CURRENT_TIMESTAMP
         WHERE "userId" = $1`,
        [userId, provider],
      ),
    catch: (error) =>
      new DatabaseQueryError({
        cause: error,
        message: "Failed to remove provider",
      }),
  });

const secretRoute = new Hono().basePath("/secret");

secretRoute.get("/", (c) =>
  Effect.gen(function* () {
    const user = yield* getAuthenticatedUser(c);
    const pool = yield* DatabasePool;

    const result = yield* queryUserSecrets(pool, user.id);
    const providers = result.rows[0]?.providers ?? [];
    const disabledProviders = result.rows[0]?.disabledProviders ?? [];

    const providerEntries = yield* Effect.forEach(
      providers,
      (provider: string) =>
        getSecret(user.id, provider).pipe(
          Effect.map(
            (keys) =>
              [
                provider,
                {
                  fields: Object.keys(keys).filter(
                    (k) => typeof keys[k] === "string" && keys[k].length > 0,
                  ),
                  enabled: !disabledProviders.includes(provider),
                },
              ] as const,
          ),
          Effect.catchTag("VaultReadError", () =>
            Effect.succeed([
              provider,
              {
                fields: [] as string[],
                enabled: !disabledProviders.includes(provider),
              },
            ] as const),
          ),
          Effect.catchTag("VaultPathError", () =>
            Effect.succeed([
              provider,
              {
                fields: [] as string[],
                enabled: !disabledProviders.includes(provider),
              },
            ] as const),
          ),
        ),
      { concurrency: "unbounded" },
    );

    const providerFields = Object.fromEntries(providerEntries);
    return c.json({ providers: providerFields });
  }).pipe(
    Effect.catchTags({
      UnauthorizedError: (err) => Effect.succeed(c.json({ error: err.message }, 401)),
      DatabaseQueryError: (err) =>
        Effect.logError("GET /v1/secret failed", { cause: err.cause }).pipe(
          Effect.as(c.json({ error: "Failed to fetch secrets" }, 500)),
        ),
    }),
    Effect.provide(AppLive),
    Effect.runPromise,
  ),
);

// ---------------------------------------------------------------------------
// POST /v1/secret - Add/update secrets for a provider
// ---------------------------------------------------------------------------
secretRoute.post("/", (c) =>
  Effect.gen(function* () {
    const user = yield* getAuthenticatedUser(c);
    const pool = yield* DatabasePool;
    const raw = yield* parseJsonBody(c);

    const body = yield* Schema.decodeUnknown(CreateSecretBodySchema)(raw).pipe(
      Effect.mapError(
        (error) =>
          new RequestValidationError({
            cause: error,
            message: "Invalid body: requires { provider, keys }",
          }),
      ),
    );

    // Fetch existing secrets, defaulting to empty if not found
    const existing = yield* getSecret(user.id, body.provider).pipe(
      Effect.catchTag("VaultReadError", () => Effect.succeed({} as Record<string, string>)),
      Effect.catchTag("VaultPathError", () => Effect.succeed({} as Record<string, string>)),
    );

    const merged = { ...existing, ...body.keys };

    yield* addSecret(user.id, body.provider, merged);
    yield* upsertProvider(pool, user.id, body.provider);

    return c.json({ success: true });
  }).pipe(
    Effect.catchTags({
      UnauthorizedError: (err) => Effect.succeed(c.json({ error: err.message }, 401)),
      RequestValidationError: (err) => Effect.succeed(c.json({ error: err.message }, 400)),
      DatabaseQueryError: (err) =>
        Effect.logError("POST /v1/secret failed (database)", { cause: err.cause }).pipe(
          Effect.as(c.json({ error: "Failed to save secret" }, 500)),
        ),
      VaultWriteError: (err) =>
        Effect.logError("POST /v1/secret failed (vault)", { cause: err.cause }).pipe(
          Effect.as(c.json({ error: "Failed to save secret" }, 500)),
        ),
      VaultPathError: (err) => Effect.succeed(c.json({ error: err.message }, 400)),
    }),
    Effect.provide(AppLive),
    Effect.runPromise,
  ),
);

// ---------------------------------------------------------------------------
// PATCH /v1/secret/:provider - Enable or disable a provider
// ---------------------------------------------------------------------------
secretRoute.patch("/:provider", (c) =>
  Effect.gen(function* () {
    const user = yield* getAuthenticatedUser(c);
    const pool = yield* DatabasePool;

    const provider = c.req.param("provider");
    if (!provider) {
      return yield* new RequestValidationError({
        message: "Missing provider parameter",
      });
    }

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

    // Check if provider exists for this user
    const result = yield* queryUserProviderList(pool, user.id);
    const providers = result.rows[0]?.providers ?? [];
    if (!providers.includes(provider)) {
      return yield* new ProviderNotConfiguredError({ provider });
    }

    if (body.enabled) {
      yield* enableProvider(pool, user.id, provider);
    } else {
      yield* disableProvider(pool, user.id, provider);
    }

    return c.json({ success: true, enabled: body.enabled });
  }).pipe(
    Effect.catchTags({
      UnauthorizedError: (err) => Effect.succeed(c.json({ error: err.message }, 401)),
      RequestValidationError: (err) => Effect.succeed(c.json({ error: err.message }, 400)),
      ProviderNotConfiguredError: (err) =>
        Effect.succeed(c.json({ error: `Provider '${err.provider}' not configured` }, 404)),
      DatabaseQueryError: (err) =>
        Effect.logError("PATCH /v1/secret/:provider failed", { cause: err.cause }).pipe(
          Effect.as(c.json({ error: "Failed to update provider" }, 500)),
        ),
    }),
    Effect.provide(AppLive),
    Effect.runPromise,
  ),
);

secretRoute.delete("/:provider", (c) =>
  Effect.gen(function* () {
    const user = yield* getAuthenticatedUser(c);
    const pool = yield* DatabasePool;

    const provider = c.req.param("provider");
    if (!provider) {
      return yield* new RequestValidationError({
        message: "Missing provider parameter",
      });
    }

    yield* deleteSecret(user.id, provider);
    yield* removeProvider(pool, user.id, provider);

    return c.json({ success: true });
  }).pipe(
    Effect.catchTags({
      UnauthorizedError: (err) => Effect.succeed(c.json({ error: err.message }, 401)),
      RequestValidationError: (err) => Effect.succeed(c.json({ error: err.message }, 400)),
      VaultDeleteError: (err) =>
        Effect.logError("DELETE /v1/secret/:provider failed (vault)", { cause: err.cause }).pipe(
          Effect.as(c.json({ error: "Failed to delete secret" }, 500)),
        ),
      VaultPathError: (err) => Effect.succeed(c.json({ error: err.message }, 400)),
      DatabaseQueryError: (err) =>
        Effect.logError("DELETE /v1/secret/:provider failed (database)", { cause: err.cause }).pipe(
          Effect.as(c.json({ error: "Failed to delete secret" }, 500)),
        ),
    }),
    Effect.provide(AppLive),
    Effect.runPromise,
  ),
);

export { secretRoute };
