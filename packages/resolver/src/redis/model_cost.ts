import { Effect, Schema } from "effect";

import { Redis } from ".";
import { TTL, REDIS_PREFIX } from "./consts";

const costSchemaParser = Schema.parseJson(
  Schema.Struct({
    input: Schema.Number,
    output: Schema.Number,
  }),
);

type Cost = typeof costSchemaParser.Type;

export const getCostForModel = (canonicalProviderModelName: string) =>
  Effect.gen(function* () {
    const redis = yield* Redis;
    const costStr = yield* redis.use((client) =>
      client.get(REDIS_PREFIX.modelToCost + canonicalProviderModelName),
    );
    if (!costStr) return [];
    return yield* Schema.decodeUnknown(costSchemaParser)(costStr);
  });

export const setCostForModel = (canonicalProviderModelName: string, cost: Cost) =>
  Effect.gen(function* () {
    const redis = yield* Redis;
    const stringifiedCost = yield* Schema.encode(costSchemaParser)(cost);
    yield* redis.use((client) =>
      client.set(
        REDIS_PREFIX.modelToCost + canonicalProviderModelName,
        stringifiedCost,
        "PX",
        TTL,
      ),
    );
  });

export const bulkSetProviderModelCost = (
  entries: Record</*canonicalProviderModelName Name*/ string, Cost>,
) =>
  Effect.gen(function* () {
    const setterEffects = Object.entries(entries).map(([canonicalProvdierModelName, cost]) =>
      setCostForModel(canonicalProvdierModelName, cost),
    );
    yield* Effect.all(setterEffects, { concurrency: 5 });
  });

export const deleteProviderModelCost = (canonicalProviderModelName: string) =>
  Effect.gen(function* () {
    const redis = yield* Redis;
    yield* redis.use((client) =>
      client.del(REDIS_PREFIX.modelToCost + canonicalProviderModelName),
    );
  });
