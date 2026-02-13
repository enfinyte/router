import { Effect } from "effect";
import { Hono } from "hono";

import { SecretService } from "../services/secret";
import { getAuthenticatedUser, parseBody } from "../middleware/auth";
import { CreateSecretBodySchema, ToggleEnabledBodySchema } from "../schemas";
import { RequestValidationError } from "../errors";
import { runHandler } from "../runtime";

export const secretRoute = new Hono().basePath("/secret");

secretRoute.get("/", (c) =>
  runHandler(
    Effect.gen(function* () {
      const user = yield* getAuthenticatedUser(c);
      const secrets = yield* SecretService;
      const providers = yield* secrets.listProviders(user.id);
      return c.json({ providers });
    }).pipe(
      Effect.catchTags({
        UnauthorizedError: (err) => Effect.succeed(c.json({ error: err.message }, 401)),
        DatabaseServiceError: (err) =>
          Effect.logError("GET /v1/secret failed", { cause: err.cause }).pipe(
            Effect.as(c.json({ error: "Failed to fetch secrets" }, 500)),
          ),
      }),
    ),
  ),
);

secretRoute.post("/", (c) =>
  runHandler(
    Effect.gen(function* () {
      const user = yield* getAuthenticatedUser(c);
      const secrets = yield* SecretService;
      const body = yield* parseBody(c, CreateSecretBodySchema);
      yield* secrets.addSecret(user.id, body.provider, body.keys);
      return c.json({ success: true });
    }).pipe(
      Effect.catchTags({
        UnauthorizedError: (err) => Effect.succeed(c.json({ error: err.message }, 401)),
        RequestValidationError: (err) => Effect.succeed(c.json({ error: err.message }, 400)),
        DatabaseServiceError: (err) =>
          Effect.logError("POST /v1/secret failed (database)", { cause: err.cause }).pipe(
            Effect.as(c.json({ error: "Failed to save secret" }, 500)),
          ),
        VaultError: (err) =>
          Effect.logError("POST /v1/secret failed (vault)", { cause: err.cause }).pipe(
            Effect.as(c.json({ error: "Failed to save secret" }, 500)),
          ),
        VaultPathError: (err) => Effect.succeed(c.json({ error: err.message }, 400)),
      }),
    ),
  ),
);

secretRoute.patch("/:provider", (c) =>
  runHandler(
    Effect.gen(function* () {
      const user = yield* getAuthenticatedUser(c);
      const secrets = yield* SecretService;

      const provider = c.req.param("provider");
      if (!provider) {
        return yield* new RequestValidationError({ message: "Missing provider parameter" });
      }

      const body = yield* parseBody(c, ToggleEnabledBodySchema);
      yield* secrets.toggleProvider(user.id, provider, body.enabled);

      return c.json({ success: true, enabled: body.enabled });
    }).pipe(
      Effect.catchTags({
        UnauthorizedError: (err) => Effect.succeed(c.json({ error: err.message }, 401)),
        RequestValidationError: (err) => Effect.succeed(c.json({ error: err.message }, 400)),
        ProviderNotConfiguredError: (err) =>
          Effect.succeed(c.json({ error: `Provider '${err.provider}' not configured` }, 404)),
        DatabaseServiceError: (err) =>
          Effect.logError("PATCH /v1/secret/:provider failed", { cause: err.cause }).pipe(
            Effect.as(c.json({ error: "Failed to update provider" }, 500)),
          ),
      }),
    ),
  ),
);

secretRoute.delete("/:provider", (c) =>
  runHandler(
    Effect.gen(function* () {
      const user = yield* getAuthenticatedUser(c);
      const secrets = yield* SecretService;

      const provider = c.req.param("provider");
      if (!provider) {
        return yield* new RequestValidationError({ message: "Missing provider parameter" });
      }

      yield* secrets.deleteProvider(user.id, provider);
      return c.json({ success: true });
    }).pipe(
      Effect.catchTags({
        UnauthorizedError: (err) => Effect.succeed(c.json({ error: err.message }, 401)),
        RequestValidationError: (err) => Effect.succeed(c.json({ error: err.message }, 400)),
        VaultError: (err) =>
          Effect.logError("DELETE /v1/secret/:provider failed (vault)", { cause: err.cause }).pipe(
            Effect.as(c.json({ error: "Failed to delete secret" }, 500)),
          ),
        VaultPathError: (err) => Effect.succeed(c.json({ error: err.message }, 400)),
        DatabaseServiceError: (err) =>
          Effect.logError("DELETE /v1/secret/:provider failed (database)", {
            cause: err.cause,
          }).pipe(Effect.as(c.json({ error: "Failed to delete secret" }, 500))),
      }),
    ),
  ),
);
