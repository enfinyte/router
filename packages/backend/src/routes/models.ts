import { Effect, Data } from "effect";
import { Hono } from "hono";

import { getAuthenticatedUser } from "../middleware/auth";
import { SecretService } from "../services/secret";
import { getAvailableModels } from "resolver";
import { runHandler } from "../runtime";

class ModelsDataError extends Data.TaggedError("ModelsDataError")<{
  cause?: unknown;
  message?: string;
}> {}

export const modelsRoute = new Hono().basePath("/models");

modelsRoute.get("/", (c) =>
  runHandler(
    Effect.gen(function* () {
      const user = yield* getAuthenticatedUser(c);
      const secrets = yield* SecretService;
      const providerMap = yield* secrets.listProviders(user.id);

      const enabledProviders = Object.entries(providerMap)
        .filter(([, info]) => info.enabled)
        .map(([id]) => id);

      const allModels = yield* Effect.tryPromise({
        try: () => getAvailableModels(),
        catch: (error) =>
          new ModelsDataError({
            cause: error,
            message: error instanceof Error ? error.message : "Failed to load models data",
          }),
      });

      const providerParam = c.req.query("provider");

      const targetProviders = providerParam
        ? enabledProviders.filter((p) => p === providerParam)
        : enabledProviders;

      const models: Record<string, string[]> = {};
      for (const provider of targetProviders) {
        const providerModels = allModels[provider];
        if (providerModels) {
          models[provider] = providerModels;
        }
      }

      return c.json({ models });
    }).pipe(
      Effect.catchTags({
        UnauthorizedError: (err) => Effect.succeed(c.json({ error: err.message }, 401)),
        DatabaseServiceError: (err) =>
          Effect.logError("GET /v1/models failed (database)", { cause: err.cause }).pipe(
            Effect.as(c.json({ error: "Failed to fetch models" }, 500)),
          ),
        ModelsDataError: (err) =>
          Effect.logError("GET /v1/models failed (models data)", { cause: err.cause }).pipe(
            Effect.as(c.json({ error: err.message ?? "Models data not available" }, 503)),
          ),
      }),
    ),
  ),
);
