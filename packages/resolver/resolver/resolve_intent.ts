import { Effect, Schema } from "effect";
import { getOpenRouterDataByPair } from "../data_manager";
import { RootSchema } from "../data_manager/schema/openrouter";
import type { IntentPair, ResolvedResponse } from "../types";
import { NoProviderAvailableError } from "../types";
import { OpenRouterProviderModelMap } from "../data_manager";

/**
 * Resolve an intent pair to a concrete provider/model by iterating through
 * the top-10 ranked models from OpenRouter and returning the highest-ranked
 * model whose provider the user has configured.
 *
 * @param pair - The parsed intent + policy (e.g., Programming / MostPopular)
 * @param userProviders - Array of provider names the user has configured
 *                        (e.g., ["openai", "anthropic", "azure"])
 */
export const resolveIntentPair = (pair: IntentPair, userProviders: string[]) =>
  Effect.gen(function* () {
    const openRouterRawData = yield* getOpenRouterDataByPair(pair);
    const openRouterData = yield* Effect.try(() => JSON.parse(openRouterRawData));
    const openRouterRoot = yield* Schema.decode(RootSchema)(openRouterData);

    const slugs = openRouterRoot.data.models.map((m) => m.slug);
    const userProviderSet = new Set(userProviders);

    // Iterate through the top-10 ranked models in order.
    // For each model, check if ANY of its provider mappings match
    // a provider the user has configured. Return the first match.
    for (const slug of slugs) {
      const mappings: ResolvedResponse[] | undefined =
        OpenRouterProviderModelMap[slug];
      if (!mappings) continue;

      for (const mapping of mappings) {
        if (userProviderSet.has(mapping.provider)) {
          return mapping;
        }
      }
    }

    // None of the top-10 models have a provider the user has configured
    return yield* Effect.fail(
      new NoProviderAvailableError({
        reason: "NoProviderConfigured",
        message: `None of the top ${slugs.length} models have a provider you have configured. Configure at least one of: ${[...new Set(slugs.flatMap((s) => (OpenRouterProviderModelMap[s] ?? []).map((m) => m.provider)))].join(", ")}`,
      }),
    );
  });
