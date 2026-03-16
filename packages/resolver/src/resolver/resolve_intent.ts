import { Array as Arr, Effect, pipe } from "effect";
import { getPotentialModelsForIntentPair } from "../data_manager";
import type { IntentPair } from "../types";
import { NoProviderAvailableError } from "../types";
import * as Redis from "../redis/index";

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
      (results) => results.flat(),
    );

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

    const availableProviders = pipe(potentialModels, getAllProvidersForPotentialModels, Arr.dedupe);

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
