import { Effect } from "effect";
import { Hono } from "hono";

import { ApiKeyService } from "../services/apikey";
import { getAuthenticatedUser, parseBody } from "../middleware/auth";
import { ToggleEnabledBodySchema, VerifyApiKeyBodySchema } from "../schemas";
import { runHandler } from "../runtime";

export const apikeyRoute = new Hono().basePath("/apikey");

apikeyRoute.get("/", (c) =>
  runHandler(
    Effect.gen(function* () {
      yield* getAuthenticatedUser(c);
      const apikeys = yield* ApiKeyService;
      const key = yield* apikeys.getKey(c.req.raw.headers);
      return c.json({ key });
    }).pipe(
      Effect.catchTags({
        UnauthorizedError: (err) => Effect.succeed(c.json({ error: err.message }, 401)),
        AuthApiError: (err) =>
          Effect.logError("GET /v1/apikey failed", { cause: err.cause }).pipe(
            Effect.as(c.json({ error: "Failed to fetch API key" }, 500)),
          ),
      }),
    ),
  ),
);

apikeyRoute.post("/", (c) =>
  runHandler(
    Effect.gen(function* () {
      const user = yield* getAuthenticatedUser(c);
      const apikeys = yield* ApiKeyService;
      const key = yield* apikeys.createKey(user.id, c.req.raw.headers);
      return c.json({ key });
    }).pipe(
      Effect.catchTags({
        UnauthorizedError: (err) => Effect.succeed(c.json({ error: err.message }, 401)),
        ApiKeyAlreadyExistsError: (err) => Effect.succeed(c.json({ error: err.message }, 400)),
        AuthApiError: (err) =>
          Effect.logError("POST /v1/apikey failed", { cause: err.cause }).pipe(
            Effect.as(c.json({ error: "Failed to create API key" }, 500)),
          ),
      }),
    ),
  ),
);

apikeyRoute.put("/", (c) =>
  runHandler(
    Effect.gen(function* () {
      const user = yield* getAuthenticatedUser(c);
      const apikeys = yield* ApiKeyService;
      const key = yield* apikeys.regenerateKey(user.id, c.req.raw.headers);
      return c.json({ key });
    }).pipe(
      Effect.catchTags({
        UnauthorizedError: (err) => Effect.succeed(c.json({ error: err.message }, 401)),
        AuthApiError: (err) =>
          Effect.logError("PUT /v1/apikey failed", { cause: err.cause }).pipe(
            Effect.as(c.json({ error: "Failed to regenerate API key" }, 500)),
          ),
      }),
    ),
  ),
);

apikeyRoute.patch("/", (c) =>
  runHandler(
    Effect.gen(function* () {
      yield* getAuthenticatedUser(c);
      const apikeys = yield* ApiKeyService;
      const body = yield* parseBody(c, ToggleEnabledBodySchema);
      const key = yield* apikeys.toggleKey(c.req.raw.headers, body.enabled);
      return c.json({ key });
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
    ),
  ),
);

apikeyRoute.delete("/", (c) =>
  runHandler(
    Effect.gen(function* () {
      yield* getAuthenticatedUser(c);
      const apikeys = yield* ApiKeyService;
      yield* apikeys.deleteAllKeys(c.req.raw.headers);
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
    ),
  ),
);

apikeyRoute.post("/verify", (c) =>
  runHandler(
    Effect.gen(function* () {
      const apikeys = yield* ApiKeyService;
      const body = yield* parseBody(c, VerifyApiKeyBodySchema);
      const result = yield* apikeys.verifyKey(body.key);

      if (!result.valid) {
        return c.json({ valid: false as const, error: result.error ?? "Invalid API key" });
      }

      return c.json({
        valid: true as const,
        providers: result.providers,
        userId: result.userId,
      });
    }).pipe(
      Effect.catchTags({
        RequestValidationError: (err) =>
          Effect.succeed(c.json({ valid: false, error: err.message }, 400)),
        AuthApiError: (err) =>
          Effect.logError("POST /v1/apikey/verify failed", { cause: err.cause }).pipe(
            Effect.as(c.json({ valid: false, error: "Verification failed" }, 500)),
          ),
        DatabaseServiceError: (err) =>
          Effect.logError("POST /v1/apikey/verify failed (database)", { cause: err.cause }).pipe(
            Effect.as(c.json({ valid: false, error: "Verification failed" }, 500)),
          ),
      }),
    ),
  ),
);
