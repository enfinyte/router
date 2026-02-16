import { Effect, Schema } from "effect";
import { type IntentPair } from "../types";
import { DATA_PATH, MODELS_MAP_DATA_PATH } from "./const";
import { FileSystem } from "@effect/platform/FileSystem";
import { ResolvedResponseSchema } from "common";

export const getOpenRouterDataByPair = (pair: IntentPair) =>
  Effect.gen(function* () {
    const OpenRouterSchema = Schema.ArrayEnsure(Schema.String);
    const fs = yield* FileSystem;
    const content = yield* fs.readFileString(
      `${DATA_PATH}/${pair.intent}/${pair.intentPolicy}.json`,
    );
    return yield* Schema.decode(OpenRouterSchema)(JSON.parse(content));
  });

export const getModelMap = Effect.gen(function* () {
  const ModelMapSchema = Schema.Record({
    key: Schema.String,
    value: Schema.ArrayEnsure(ResolvedResponseSchema),
  });
  const fs = yield* FileSystem;
  const content = yield* fs.readFileString(MODELS_MAP_DATA_PATH);
  return yield* Schema.decode(ModelMapSchema)(JSON.parse(content));
});
