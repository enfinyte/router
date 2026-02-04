import { Effect } from "effect";
import { intentReverseMap, intentPolicyReverseMap } from "../types";
import type { IntentPair } from "../types";
import { DATA_PATH } from "./const";
import { FileSystem } from "@effect/platform/FileSystem";
import { runDataFetch } from "./fetch";
import type { PlatformError } from "@effect/platform/Error";

export const getOpenRouterDataByPair = (
  pair: IntentPair,
): Effect.Effect<string, PlatformError | Error, FileSystem> =>
  Effect.gen(function* () {
    yield* runDataFetch(DATA_PATH);

    const category = intentReverseMap[pair.intent];
    const order = intentPolicyReverseMap[pair.intentPolicy];

    const fs = yield* FileSystem;
    return yield* fs.readFileString(`${DATA_PATH}/${category}/${order}.json`);
  });

export const getModelsDevData = Effect.gen(function* () {
  yield* runDataFetch(DATA_PATH);
  const fs = yield* FileSystem;
  return yield* fs.readFileString(`${DATA_PATH}/models_dev.json`);
});

export const getOpenRouterAllModels = Effect.gen(function* () {
  yield* runDataFetch(DATA_PATH);

  const fs = yield* FileSystem;
  return yield* fs.readFileString(`${DATA_PATH}/openrouter.json`);
});
