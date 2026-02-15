import { Array as Arr, Effect, Option, pipe } from "effect";
import { getModelMap, getOpenRouterDataByPair } from "../data_manager";
import type { IntentPair, ResolvedResponse } from "../types";
import { NoProviderAvailableError } from "../types";

const findMatchingMapping = (
  modelMap: Record<string, ReadonlyArray<ResolvedResponse>>,
  slug: string,
  userProviderSet: ReadonlySet<string>,
): Option.Option<ResolvedResponse> =>
  pipe(
    modelMap[slug] ?? [],
    Arr.findFirst((mapping) => userProviderSet.has(mapping.provider)),
  );

export const resolveIntentPair = (pair: IntentPair, userProviders: string[]) =>
  Effect.gen(function* () {
    const openRouterData = yield* getOpenRouterDataByPair(pair);
    const userProviderSet = new Set(userProviders);
    const modelMap = yield* getModelMap;

    const match = pipe(
      openRouterData,
      Arr.findFirst((slug) => Option.isSome(findMatchingMapping(modelMap, slug, userProviderSet))),
      Option.flatMap((slug) => findMatchingMapping(modelMap, slug, userProviderSet)),
    );

    if (Option.isSome(match)) {
      return match.value;
    }

    const availableProviders = pipe(
      openRouterData,
      Arr.flatMap((s): string[] => (modelMap[s] ?? []).map((m) => m.provider)),
      Arr.dedupe,
    );

    return yield* new NoProviderAvailableError({
      reason: "NoProviderConfigured",
      message: `None of the top ${openRouterData.length} models have a provider you have configured. Configure at least one of: ${availableProviders.join(", ")}`,
    });
  });
