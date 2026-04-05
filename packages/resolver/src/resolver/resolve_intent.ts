import { Array as Arr, Effect } from "effect";

import type { IntentPair } from "../types";

import { resolverLog } from "../log";
import { getPotentialModelsForIntentPair } from "../data_manager";
import * as Redis from "../redis/index";
import { NoProviderAvailableError } from "../types";

export const resolveIntentPair = (pair: IntentPair, userProviders: string[]) =>
  Effect.gen(function* () {
    const l = resolverLog("resolveIntentPair");

    yield* l.debug("Resolving intent pair", {
      intent: pair.intent,
      intentPolicy: pair.intentPolicy,
      providerCount: userProviders.length,
    });

    const potentialModels = yield* getPotentialModelsForIntentPair(pair);
    const userProviderSet = new Set(userProviders);

    const pairs = yield* Effect.map(
      Effect.all(
        potentialModels.map((modelNameSlug) =>
          Redis.getProvidersForModel(modelNameSlug).pipe(
            Effect.map((providers) =>
              providers.filter(({ provider }) => userProviderSet.has(provider)),
            ),
          ),
        ),
      ),
      (results) =>
        results.flat().map((p) => ({ ...p, category: pair.intent as string | null })),
    );

    if (pairs.length > 0) {
      yield* l.info("Intent resolved to provider/model", {
        intent: pair.intent,
        intentPolicy: pair.intentPolicy,
      });
      return pairs;
    }

    const availableProviders = yield* Effect.map(
      Effect.all(potentialModels.map((m) => Redis.getProvidersForModel(m))),
      (results) => Arr.dedupe(results.flat().map(({ provider }) => provider)),
    );

    yield* l.warn("No matching provider found for intent", {
      intent: pair.intent,
      intentPolicy: pair.intentPolicy,
      userProviders: userProviders.join(","),
      availableProviders: availableProviders.join(","),
      candidateCount: potentialModels.length,
    });

    return yield* new NoProviderAvailableError({
      reason: "NoProviderConfigured",
      message: `None of the top ${potentialModels.length} models have a provider you have configured. Configure at least one of: ${availableProviders.join(", ")}`,
    });
  });
