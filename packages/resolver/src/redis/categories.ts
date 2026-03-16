import { Effect, Schema } from "effect";
import { Redis } from ".";
import { OpenRouterMapSchema } from "../data_manager/schema/openrouter";
import { TTL } from "./consts";

const PREFIX = "enfinyte:categories";
const modelsSchemaParser = Schema.parseJson(OpenRouterMapSchema);

const buildKey = (category: string, order: string) => `${PREFIX}:${category}:${order}`;

export const getModelsForCategoryAndOrder = (category: string, order: string) =>
  Effect.gen(function* () {
    const redis = yield* Redis;
    const models = yield* redis.use((client) => client.get(buildKey(category, order)));
    if (!models) return [];
    return yield* Schema.decodeUnknown(modelsSchemaParser)(models);
  });

export const setModelsForCategoryAndOrder = (
  category: string,
  order: string,
  models: readonly string[],
) =>
  Effect.gen(function* () {
    const redis = yield* Redis;
    const stringifiedProviders = yield* Schema.encode(modelsSchemaParser)(models);
    yield* redis.use((client) =>
      client.set(buildKey(category, order), stringifiedProviders, "PX", TTL),
    );
  });
