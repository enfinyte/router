import { Effect } from "effect";
import { type IntentPair } from "../types";
import * as Redis from "../redis/index";

export const getPotentialModelsForIntentPair = (pair: IntentPair) =>
  Effect.gen(function* () {
    yield* Effect.logDebug("Reading Categories data").pipe(
      Effect.annotateLogs({
        service: "DataManager",
        operation: "getOpenRouterDataByPair",
        intent: pair.intent,
        intentPolicy: pair.intentPolicy,
      }),
    );

    const result = yield* Redis.getModelsForCategoryAndOrder(pair.intent, pair.intentPolicy);

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
