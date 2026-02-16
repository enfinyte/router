import { Effect, Schema } from "effect";
import { type IntentPair } from "../types";
import { DATA_PATH, MODELS_MAP_DATA_PATH } from "./const";
import { FileSystem } from "@effect/platform/FileSystem";
import { ResolvedResponseSchema } from "common";

export const getOpenRouterDataByPair = (pair: IntentPair) =>
  Effect.gen(function* () {
    const OpenRouterSchema = Schema.ArrayEnsure(Schema.String);
    const filePath = `${DATA_PATH}/${pair.intent}/${pair.intentPolicy}.json`;

    yield* Effect.logDebug("Reading OpenRouter data").pipe(
      Effect.annotateLogs({
        service: "DataManager",
        operation: "getOpenRouterDataByPair",
        intent: pair.intent,
        intentPolicy: pair.intentPolicy,
        filePath,
      }),
    );

    const fs = yield* FileSystem;
    const content = yield* fs.readFileString(filePath);
    const result = yield* Schema.decode(OpenRouterSchema)(JSON.parse(content)).pipe(
      Effect.tapError((err) =>
        Effect.logError("OpenRouter data schema decode failed").pipe(
          Effect.annotateLogs({
            service: "DataManager",
            operation: "getOpenRouterDataByPair",
            filePath,
            cause: String(err),
          }),
        ),
      ),
    );

    yield* Effect.logDebug("OpenRouter data loaded").pipe(
      Effect.annotateLogs({
        service: "DataManager",
        operation: "getOpenRouterDataByPair",
        intent: pair.intent,
        intentPolicy: pair.intentPolicy,
        slugCount: result.length,
      }),
    );

    return result;
  });

export const getModelMap = Effect.gen(function* () {
  const ModelMapSchema = Schema.Record({
    key: Schema.String,
    value: Schema.ArrayEnsure(ResolvedResponseSchema),
  });

  yield* Effect.logDebug("Reading model map").pipe(
    Effect.annotateLogs({
      service: "DataManager",
      operation: "getModelMap",
      filePath: MODELS_MAP_DATA_PATH,
    }),
  );

  const fs = yield* FileSystem;
  const content = yield* fs.readFileString(MODELS_MAP_DATA_PATH);
  const result = yield* Schema.decode(ModelMapSchema)(JSON.parse(content)).pipe(
    Effect.tapError((err) =>
      Effect.logError("Model map schema decode failed").pipe(
        Effect.annotateLogs({
          service: "DataManager",
          operation: "getModelMap",
          filePath: MODELS_MAP_DATA_PATH,
          cause: String(err),
        }),
      ),
    ),
  );

  yield* Effect.logDebug("Model map loaded").pipe(
    Effect.annotateLogs({
      service: "DataManager",
      operation: "getModelMap",
      entryCount: Object.keys(result).length,
    }),
  );

  return result;
});
