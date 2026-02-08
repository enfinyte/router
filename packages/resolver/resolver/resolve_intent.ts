import { Effect, Schema } from "effect";
import { getOpenRouterDataByPair } from "../data_manager";
import { RootSchema } from "../data_manager/schema/openrouter";
import type { IntentPair } from "../types";
import { OpenRouterProviderModelMap } from "../data_manager";

export const resolveIntentPair = (pair: IntentPair) =>
  Effect.gen(function* () {
    const openRouterRawData = yield* getOpenRouterDataByPair(pair);
    const openRouterData = yield* Effect.try(() => JSON.parse(openRouterRawData));
    const openRouterRoot = yield* Schema.decode(RootSchema)(openRouterData);
    // TODO: change this later to do checks
    // check : if the user has the required providers setup
    // fail: if the providers aren't setup, may be throw an error
    const top1 = openRouterRoot.data.models.map((key) => key.slug)[0]!;
    return OpenRouterProviderModelMap[top1]![0]!;
  });
