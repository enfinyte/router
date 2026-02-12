import { Array as Arr, Effect, Option, pipe } from "effect";
import { getOpenRouterDataByPair } from "../data_manager";
import type { IntentPair, ResolvedResponse } from "../types";
import { DataFetchError, NoProviderAvailableError } from "../types";
import { CategoryProviderModelMap } from "../data_manager";

const findMatchingMapping = (
  slug: string,
  userProviderSet: ReadonlySet<string>,
): Option.Option<ResolvedResponse> =>
  pipe(
    CategoryProviderModelMap[slug] ?? [],
    Arr.findFirst((mapping) => userProviderSet.has(mapping.provider)),
  );

export const resolveIntentPair = (pair: IntentPair, userProviders: string[]) =>
  Effect.gen(function* () {
    const openRouterRawData = yield* getOpenRouterDataByPair(pair);

    const openRouterData: string[] = yield* Effect.try({
      try: () => JSON.parse(openRouterRawData),
      catch: (error) =>
        new DataFetchError({
          reason: "DataParseFailed",
          message: "Failed to parse cached OpenRouter JSON data",
          cause: error,
        }),
    });

    const userProviderSet = new Set(userProviders);

    const match = pipe(
      openRouterData,
      Arr.findFirst((slug) => Option.isSome(findMatchingMapping(slug, userProviderSet))),
      Option.flatMap((slug) => findMatchingMapping(slug, userProviderSet)),
    );

    if (Option.isSome(match)) {
      return match.value;
    }

    const availableProviders = pipe(
      openRouterData,
      Arr.flatMap((s) => (CategoryProviderModelMap[s] ?? []).map((m) => m.provider)),
      Arr.dedupe,
    );

    return yield* new NoProviderAvailableError({
      reason: "NoProviderConfigured",
      message: `None of the top ${openRouterData.length} models have a provider you have configured. Configure at least one of: ${availableProviders.join(", ")}`,
    });
  });
