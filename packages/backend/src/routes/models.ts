import { Effect } from "effect";
import { Hono } from "hono";
import { ResolverService } from "resolver";

import { getAuthenticatedUser } from "../middleware/auth";
import { runHandler } from "../runtime";
import { SecretService } from "../services/secret";

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

      const resolverService = yield* ResolverService;
      const allModels = yield* resolverService.getAvailableModels();

      const providerParam = c.req.query("provider");

      const targetProviders = providerParam
        ? enabledProviders.filter((p) => p === providerParam)
        : enabledProviders;

      const models: Record<string, readonly string[]> = {};
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
        DataFetchError: (err) =>
          Effect.logError("GET /v1/models failed (dataFetch)", { cause: err.cause }).pipe(
            Effect.as(c.json({ error: "Failed to fetch models" }, 500)),
          ),
        RedisError: (err) =>
          Effect.logError("GET /v1/models failed (redis)", { cause: err.cause }).pipe(
            Effect.as(c.json({ error: "Failed to fetch models" }, 500)),
          ),
        ParseError: (err) =>
          Effect.logError("GET /v1/models failed (parse)", { cause: err }).pipe(
            Effect.as(c.json({ error: "Failed to parse models data" }, 500)),
          ),
      }),
    ),
  ),
);
