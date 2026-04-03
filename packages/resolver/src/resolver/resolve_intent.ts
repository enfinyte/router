import { Array as Arr, Effect } from "effect";

import type { IntentPair } from "../types";

import { getPotentialModelsForIntentPair } from "../data_manager";
import * as Redis from "../redis/index";
import { NoProviderAvailableError } from "../types";

const getAllProvidersForModel = (modelNameSlug: string) =>
  Effect.gen(function* () {
    return yield* Redis.getProvidersForModel(modelNameSlug);
  });

const findMatchingMapping = (modelNameSlug: string, userProviderSet: ReadonlySet<string>) =>
  Effect.gen(function* () {
    const providersForModel = yield* getAllProvidersForModel(modelNameSlug);
    return providersForModel.filter(({ provider }) => userProviderSet.has(provider));
  });

const getAllProvidersForPotentialModels = (modelNameSlugs: readonly string[]) =>
  Effect.gen(function* () {
    const providerArrays = yield* Effect.all(modelNameSlugs.map(getAllProvidersForModel));
    return providerArrays.flat().map(({ provider }) => provider);
  });

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

    const potentialModels = yield* getPotentialModelsForIntentPair(pair);
    const userProviderSet = new Set(userProviders);

    const pairs = yield* Effect.map(
      Effect.all(
        potentialModels.map((modelNameSlug) => findMatchingMapping(modelNameSlug, userProviderSet)),
      ),
      (results) =>
        results.flat().map((p) => ({ ...p, category: pair.intent as string | null })),
    );

    if (pairs.length > 0) {
      yield* Effect.logInfo("Intent resolved to provider/model").pipe(
        Effect.annotateLogs({
          service: "Resolver",
          operation: "resolveIntentPair",
          intent: pair.intent,
          intentPolicy: pair.intentPolicy,
        }),
      );
      return pairs;
    }

    const availableProviders = yield* Effect.map(
      getAllProvidersForPotentialModels(potentialModels),
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
        candidateCount: potentialModels.length,
      }),
    );

    return yield* new NoProviderAvailableError({
      reason: "NoProviderConfigured",
      message: `None of the top ${potentialModels.length} models have a provider you have configured. Configure at least one of: ${availableProviders.join(", ")}`,
    });
  });
