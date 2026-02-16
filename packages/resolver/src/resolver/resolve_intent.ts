import { Array as Arr, Effect, Option, pipe } from "effect";
import { getModelMap, getOpenRouterDataByPair } from "../data_manager";
import type { IntentPair } from "../types";
import { NoProviderAvailableError } from "../types";
import type { ResolvedResponse } from "common";

const findMatchingMapping = (
  modelMap: Record<string, ReadonlyArray<ResolvedResponse>>,
  slug: string,
  userProviderSet: ReadonlySet<string>,
  excludedResponsesSet: ReadonlySet<string>,
): Option.Option<ResolvedResponse> => {
  return pipe(
    modelMap[slug] ?? [],
    Arr.findFirst(
      (mapping) =>
        !excludedResponsesSet.has(`${mapping.provider}:${mapping.model}`) &&
        userProviderSet.has(mapping.provider),
    ),
  );
};

export const resolveIntentPair = (
  pair: IntentPair,
  userProviders: string[],
  excludedResponses: ResolvedResponse[],
) =>
  Effect.gen(function* () {
    yield* Effect.logDebug("Resolving intent pair").pipe(
      Effect.annotateLogs({
        service: "Resolver",
        operation: "resolveIntentPair",
        intent: pair.intent,
        intentPolicy: pair.intentPolicy,
        providerCount: userProviders.length,
        excludedCount: excludedResponses.length,
      }),
    );

    const openRouterData = yield* getOpenRouterDataByPair(pair);
    const userProviderSet = new Set(userProviders);
    const excludedResponsesSet = new Set(excludedResponses.map((r) => `${r.provider}:${r.model}`));
    const modelMap = yield* getModelMap;

    const match = pipe(
      openRouterData,
      Arr.findFirst((slug) =>
        Option.isSome(findMatchingMapping(modelMap, slug, userProviderSet, excludedResponsesSet)),
      ),
      Option.flatMap((slug) =>
        findMatchingMapping(modelMap, slug, userProviderSet, excludedResponsesSet),
      ),
    );

    if (Option.isSome(match)) {
      yield* Effect.logInfo("Intent resolved to provider/model").pipe(
        Effect.annotateLogs({
          service: "Resolver",
          operation: "resolveIntentPair",
          intent: pair.intent,
          intentPolicy: pair.intentPolicy,
          provider: match.value.provider,
          model: match.value.model,
        }),
      );
      return match.value;
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
