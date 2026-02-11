import { Array as Arr, Effect, Option, Schema, pipe } from "effect";
import { getOpenRouterDataByPair } from "../data_manager";
import { RootSchema } from "../data_manager/schema/openrouter";
import type { IntentPair, ResolvedResponse } from "../types";
import { DataFetchError, NoProviderAvailableError } from "../types";
import { OpenRouterProviderModelMap } from "../data_manager";

const findMatchingMapping = (
  slug: string,
  userProviderSet: ReadonlySet<string>,
): Option.Option<ResolvedResponse> =>
  pipe(
    OpenRouterProviderModelMap[slug] ?? [],
    Arr.findFirst((mapping) => userProviderSet.has(mapping.provider)),
  );

export const resolveIntentPair = (pair: IntentPair, userProviders: string[]) =>
  Effect.gen(function* () {
    const openRouterRawData = yield* getOpenRouterDataByPair(pair);

    const openRouterData = yield* Effect.try({
      try: () => JSON.parse(openRouterRawData) as unknown,
      catch: (error) =>
        new DataFetchError({
          reason: "DataParseFailed",
          message: "Failed to parse cached OpenRouter JSON data",
          cause: error,
        }),
    });

    const openRouterRoot = yield* Schema.decodeUnknown(RootSchema)(openRouterData).pipe(
      Effect.mapError(
        (parseError) =>
          new DataFetchError({
            reason: "DataParseFailed",
            message: "Cached OpenRouter data does not match expected schema",
            cause: parseError,
          }),
      ),
    );

    const slugs = openRouterRoot.data.models.map((m) => m.slug);
    const userProviderSet = new Set(userProviders);

    const match = pipe(
      slugs,
      Arr.findFirst((slug) => Option.isSome(findMatchingMapping(slug, userProviderSet))),
      Option.flatMap((slug) => findMatchingMapping(slug, userProviderSet)),
    );

    if (Option.isSome(match)) {
      return match.value;
    }

    const availableProviders = pipe(
      slugs,
      Arr.flatMap((s) => (OpenRouterProviderModelMap[s] ?? []).map((m) => m.provider)),
      Arr.dedupe,
    );

    return yield* new NoProviderAvailableError({
      reason: "NoProviderConfigured",
      message: `None of the top ${slugs.length} models have a provider you have configured. Configure at least one of: ${availableProviders.join(", ")}`,
    });
  });
