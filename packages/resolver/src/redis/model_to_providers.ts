import { Effect, Schema } from "effect";

import { Redis } from ".";
import { TTL } from "./consts";

const PREFIX = "enfinyte:model_to_providers:";
const providersSchemaParser = Schema.parseJson(
  Schema.Array(
    Schema.Struct({
      model: Schema.String,
      provider: Schema.String,
    }),
  ),
);

type providers = typeof providersSchemaParser.Type;

export const getProvidersForModel = (canonicalModelName: string) =>
  Effect.gen(function* () {
    const redis = yield* Redis;
    const providersStr = yield* redis.use((client) => client.get(PREFIX + canonicalModelName));
    if (!providersStr) return [];
    return yield* Schema.decodeUnknown(providersSchemaParser)(providersStr);
  });

export const setProvidersForModel = (canonicalModelName: string, providers: providers) =>
  Effect.gen(function* () {
    const redis = yield* Redis;
    const stringifiedProviders = yield* Schema.encode(providersSchemaParser)(providers);
    yield* redis.use((client) =>
      client.set(PREFIX + canonicalModelName, stringifiedProviders, "PX", TTL),
    );
  });

export const bulkSetProvidersForModels = (
  entries: Record</*canonicalModel Name*/ string, providers>,
) =>
  Effect.gen(function* () {
    const setterEffects = Object.entries(entries).map(([canonicalModelName, providers]) =>
      setProvidersForModel(canonicalModelName, providers),
    );
    yield* Effect.all(setterEffects, { concurrency: 5 });
  });

export const deleteModel = (canonicalModelName: string) =>
  Effect.gen(function* () {
    const redis = yield* Redis;
    yield* redis.use((client) => client.del(PREFIX + canonicalModelName));
  });
