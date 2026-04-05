import { Effect } from "effect";
import { type IntentPair } from "../types";
import { dataManagerLog } from "../log";
import * as Redis from "../redis/index";

export const getPotentialModelsForIntentPair = (pair: IntentPair) =>
  Effect.gen(function* () {
    const l = dataManagerLog("getPotentialModels");

    yield* l.debug("Reading category data", {
      intent: pair.intent,
      intentPolicy: pair.intentPolicy,
    });

    return yield* Redis.getModelsForCategoryAndOrder(pair.intent, pair.intentPolicy);
  });
