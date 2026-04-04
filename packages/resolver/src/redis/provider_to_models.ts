import { Effect, Schema } from "effect";
import { SUPPORTED_PROVIDERS } from "common";
import { Redis } from ".";
import { TTL, REDIS_PREFIX } from "./consts";

const modelsSchemaParser = Schema.parseJson(Schema.Array(Schema.String));
type models = typeof modelsSchemaParser.Type;

export const getModelsForProvider = (provider: string) =>
  Effect.gen(function* () {
    const redis = yield* Redis;

    const modelsStr = yield* redis.use((client) =>
      client.get(REDIS_PREFIX.providerToModels + provider),
    );
    if (!modelsStr) return [];

    return yield* Schema.decodeUnknown(modelsSchemaParser)(modelsStr);
  });

export const setModelsForProvider = (provider: string, models: readonly string[]) =>
  Effect.gen(function* () {
    const redis = yield* Redis;
    const stringifiedModels = yield* Schema.encode(modelsSchemaParser)(models);
    yield* redis.use((client) =>
      client.set(REDIS_PREFIX.providerToModels + provider, stringifiedModels, "PX", TTL),
    );
  });

export const bulkSetModelsForProvider = (entries: Record</*Provider Name*/ string, models>) =>
  Effect.gen(function* () {
    //TODO: use mset
    const setterEffects = Object.entries(entries).map(([provider, models]) =>
      setModelsForProvider(provider, models),
    );
    yield* Effect.all(setterEffects, { concurrency: "unbounded" });
  });

export const getAllModelsGroupedByProvider = () =>
  Effect.gen(function* () {
    const redis = yield* Redis;
    const keys = SUPPORTED_PROVIDERS.map((p: string) => REDIS_PREFIX.providerToModels + p);

    const values = yield* redis.use((client) => client.mget(...keys));

    const entries = yield* Effect.all(
      SUPPORTED_PROVIDERS.flatMap((provider, i) => {
        const raw = values[i];
        if (!raw) return [];
        return [
          Schema.decodeUnknown(modelsSchemaParser)(raw).pipe(
            Effect.map((models) => [provider, models] as const),
          ),
        ];
      }),
    );

    return entries.reduce<Record<string, readonly string[]>>((acc, [provider, models]) => {
      acc[provider] = models;
      return acc;
    }, {});
  });

export const deleteProvider = (provider: string) =>
  Effect.gen(function* () {
    const redis = yield* Redis;
    yield* redis.use((client) => client.del(REDIS_PREFIX.providerToModels + provider));
  });
