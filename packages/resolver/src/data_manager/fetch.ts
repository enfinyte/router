import { Effect, Clock, Duration, Schema } from "effect";
import { DataFetchError } from "../types";
import { ORDERS, CATEGORIES } from "../types";
import { SUPPORTED_PROVIDERS } from "common";
import { ProviderModelMapSchema } from "./schema/modelsdev";
import { OpenRouterMapSchema } from "./schema/openrouter";
import { generateModelMap } from "./model_map";
import * as Redis from "../redis";

const OPENROUTER_BASE = "https://openrouter.ai/api/frontend/models";
const MODELS_DEV_BASE = "https://models.dev/api.json";

const DATA_TTL = Duration.hours(12);

const normalizeOpenRouterCategory = (providedCategory: string): string => {
  switch (providedCategory) {
    case "seo":
      return "marketing/seo";
    default:
      return providedCategory;
  }
};

const openrouterCategoryUrl = (category: string, order: string) => {
  const normalizedCategory = normalizeOpenRouterCategory(category);
  return `${OPENROUTER_BASE}/find?categories=${normalizedCategory}&order=${order}`;
};

const fetchJson = (url: string) =>
  Effect.gen(function* () {
    yield* Effect.logDebug("Fetching JSON").pipe(
      Effect.annotateLogs({ service: "DataManager", operation: "fetchJson", url }),
    );

    const response = yield* Effect.tryPromise({
      try: () => fetch(url),
      catch: (error) =>
        new DataFetchError({
          reason: "APICallFailed",
          message: `API call to ${url} failed`,
          cause: error,
        }),
    }).pipe(
      Effect.tapError((err) =>
        Effect.logError("API call failed").pipe(
          Effect.annotateLogs({
            service: "DataManager",
            operation: "fetchJson",
            url,
            reason: err.reason,
            cause: err.cause instanceof Error ? err.cause.message : String(err.cause),
          }),
        ),
      ),
    );

    return yield* Effect.tryPromise({
      try: () => response.json(),
      catch: (error) =>
        new DataFetchError({
          reason: "JSONParseFailed",
          message: `JSON parsing failed for response from ${url}`,
          cause: error,
        }),
    }).pipe(
      Effect.tapError((err) =>
        Effect.logError("JSON parse failed").pipe(
          Effect.annotateLogs({
            service: "DataManager",
            operation: "fetchJson",
            url,
            reason: err.reason,
          }),
        ),
      ),
    );
  });

function fetchAndAction<A, R, E2, Req2>(
  url: string,
  action: (json: A) => Effect.Effect<R, E2, Req2>,
): Effect.Effect<R, DataFetchError | E2, Req2> {
  return Effect.gen(function* () {
    const json = (yield* fetchJson(url)) as A;
    return yield* action(json);
  });
}

const openRouterAction = (category: string, order: string) => (json: string[]) =>
  Effect.gen(function* () {
    const parsed = yield* Schema.decodeUnknown(OpenRouterMapSchema)(json).pipe(
      Effect.tapError((err) =>
        Effect.logError("OpenRouter schema decode failed").pipe(
          Effect.annotateLogs({
            service: "DataManager",
            operation: "populate",
            key: `${category}:${order}`,
            cause: String(err),
          }),
        ),
      ),
    );

    yield* Redis.setModelsForCategoryAndOrder(category, order, parsed);
    return parsed;
  });

const modelsDevAction = (json: Record<string, string[]>) =>
  Effect.gen(function* () {
    const parsed = yield* Schema.decodeUnknown(ProviderModelMapSchema)(json).pipe(
      Effect.tapError((err) =>
        Effect.logError("models.dev schema decode failed").pipe(
          Effect.annotateLogs({
            service: "DataManager",
            operation: "populate",
            key: `models.dev`,
            cause: String(err),
          }),
        ),
      ),
    );

    const supported = SUPPORTED_PROVIDERS.reduce(
      (acc, provider: string) => {
        acc[provider] = [...(parsed[provider] ?? [])];
        return acc;
      },
      {} as Record<string, string[]>,
    );

    yield* Redis.bulkSetModelsForProvider(supported);
    return supported;
  });

const populate = () =>
  Effect.gen(function* () {
    yield* Effect.logInfo("Populating data cache").pipe(
      Effect.annotateLogs({ service: "DataManager", operation: "populate" }),
    );

    const categoryFetches = CATEGORIES.flatMap((category) =>
      ORDERS.map((order) =>
        fetchAndAction(openrouterCategoryUrl(category, order), openRouterAction(category, order)),
      ),
    );

    const totalFetches = 1 + categoryFetches.length;
    yield* Effect.logDebug("Starting concurrent data fetches").pipe(
      Effect.annotateLogs({
        service: "DataManager",
        operation: "populate",
        totalFetches,
        categoryCount: CATEGORIES.length,
        orderCount: ORDERS.length,
      }),
    );

    const [modelsDev, ...openRouter] = yield* Effect.all(
      [fetchAndAction(MODELS_DEV_BASE, modelsDevAction), ...categoryFetches],
      {
        concurrency: "unbounded",
      },
    );

    yield* Effect.logInfo("All data fetches completed").pipe(
      Effect.annotateLogs({
        service: "DataManager",
        operation: "populate",
        totalFetches,
        openRouterSlugCount: (openRouter.flat() as string[]).length,
      }),
    );

    // TODO: do a runtime check to see if they match our expected schema, and log any discrepancies for debugging purposes
    const modelMap = generateModelMap(
      openRouter.flat() as string[],
      modelsDev as Readonly<Record<string, string[]>>,
    );

    const mapEntryCount = Object.keys(modelMap).length;
    yield* Effect.logInfo("Model map generated").pipe(
      Effect.annotateLogs({
        service: "DataManager",
        operation: "populate",
        mapEntryCount,
      }),
    );

    yield* Redis.bulkSetProvidersForModels(modelMap);
    yield* Redis.markLastFetchPoint();
  });

export const runDataFetch = () =>
  Effect.gen(function* () {
    const lastFetchedAt = yield* Redis.getLastFetchPoint();

    if (lastFetchedAt) {
      yield* Effect.logDebug("Data cache is fresh, skipping fetch").pipe(
        Effect.annotateLogs({
          service: "DataManager",
          operation: "runDataFetch",
          lastFetchedAt: new Date(lastFetchedAt).toISOString(),
          ttlHours: Duration.toHours(DATA_TTL),
        }),
      );
      return;
    } else {
      yield* Effect.logInfo(
        "Either Data cache is stale or No data cache found, performing fetch",
      ).pipe(Effect.annotateLogs({ service: "DataManager", operation: "runDataFetch" }));
    }

    yield* populate();

    yield* Effect.logInfo("Data cache refreshed").pipe(
      Effect.annotateLogs({ service: "DataManager", operation: "runDataFetch" }),
    );
  });
