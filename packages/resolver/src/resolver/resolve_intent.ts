import { Array as Arr, Effect, pipe } from "effect";
import { getModelMap, getOpenRouterDataByPair } from "../data_manager";
import type { IntentPair } from "../types";
import { NoProviderAvailableError } from "../types";
import type { ResolvedResponse } from "common";

const findMatchingMapping = (
  modelMap: Record<string, ReadonlyArray<ResolvedResponse>>,
  modelNameSlug: string,
  userProviderSet: ReadonlySet<string>,
) => {
  return pipe(
    modelMap[modelNameSlug] ?? [],
    Arr.filter((mapping) => userProviderSet.has(mapping.provider)),
  );
};

export const resolveIntentPair = (pair: IntentPair, userProviders: string[]) =>
  Effect.gen(function* () {
    yield* Effect.logDebug("Resolving intent pair").pipe(
      Effect.annotateLogs({
        service: "Resolver",
        operation: "resolveIntentPair",
        intent: pair.intent,
        intentPolicy: pair.intentPolicy,
        providerCount: userProviders.length,
      }),
    );

    const openRouterData = yield* getOpenRouterDataByPair(pair);
    const userProviderSet = new Set(userProviders);
    const modelMap = yield* getModelMap;

    const pairs = openRouterData
      .map((modelNameSlug) => findMatchingMapping(modelMap, modelNameSlug, userProviderSet))
      .flat();

    if (pairs.length > 0) {
      yield* Effect.logInfo("Intent resolved to provider/model").pipe(
        Effect.annotateLogs({
          service: "Resolver",
          operation: "resolveIntentPair",
          intent: pair.intent,
          intentPolicy: pair.intentPolicy,
          pairs: pairs,
        }),
      );
      return pairs;
    }

    const availableProviders = pipe(
      openRouterData,
      Arr.flatMap((s): string[] => (modelMap[s] ?? []).map((m) => m.provider)),
      Arr.dedupe,
    );

    yield* Effect.logWarning("No matching provider found for intent").pipe(
      Effect.annotateLogs({
        service: "Resolver",
        operation: "resolveIntentPair",
        intent: pair.intent,
        intentPolicy: pair.intentPolicy,
        userProviders: userProviders.join(","),
        availableProviders: availableProviders.join(","),
        candidateCount: openRouterData.length,
      }),
    );

    return yield* new NoProviderAvailableError({
      reason: "NoProviderConfigured",
      message: `None of the top ${openRouterData.length} models have a provider you have configured. Configure at least one of: ${availableProviders.join(", ")}`,
    });
  });
