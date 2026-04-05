import { SUPPORTED_PROVIDERS } from "common";
import { Effect, Duration, Schema } from "effect";

import { dataManagerLog } from "../log";
import * as Redis from "../redis/index";
import { DataFetchError } from "../types";
import { ORDERS, CATEGORIES } from "../types";
import { generateModelMap } from "./model_map";
import { ProviderModelMapSchema, ProviderModelToCostSchema } from "./schema/modelsdev";
import { OpenRouterMapSchema } from "./schema/openrouter";

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
    const l = dataManagerLog("fetchJson");
    yield* l.debug("Fetching", { url });

    const response = yield* Effect.tryPromise({
      try: () => fetch(url),
      catch: (error) =>
        new DataFetchError({
          reason: "APICallFailed",
          message: `API call to ${url} failed`,
          cause: error,
        }),
    });

    return yield* Effect.tryPromise({
      try: () => response.json(),
      catch: (error) =>
        new DataFetchError({
          reason: "JSONParseFailed",
          message: `JSON parsing failed for response from ${url}`,
          cause: error,
        }),
    });
  });

const fetchOpenRouterCategory = (category: string, order: string) =>
  Effect.gen(function* () {
    const json: unknown = yield* fetchJson(openrouterCategoryUrl(category, order));

    const parsed = yield* Schema.decodeUnknown(OpenRouterMapSchema)(json).pipe(
      Effect.mapError(
        () =>
          new DataFetchError({
            reason: "DataParseFailed",
            message: `OpenRouter schema decode failed for ${category}:${order}`,
          }),
      ),
    );

    yield* Redis.setModelsForCategoryAndOrder(category, order, parsed);
    return parsed;
  });

const processModelsDevModels = (json: unknown) =>
  Effect.gen(function* () {
    const parsed = yield* Schema.decodeUnknown(ProviderModelMapSchema)(json).pipe(
      Effect.mapError(
        () =>
          new DataFetchError({
            reason: "DataParseFailed",
            message: "models.dev model map schema decode failed",
          }),
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

const processModelsDevCosts = (json: unknown) =>
  Effect.gen(function* () {
    const parsedCost = yield* Schema.decodeUnknown(ProviderModelToCostSchema)(json).pipe(
      Effect.mapError(
        () =>
          new DataFetchError({
            reason: "DataParseFailed",
            message: "models.dev cost schema decode failed",
          }),
      ),
    );

    const supportedCost: Record<string, { input: number; output: number }> = {};
    for (const provider of SUPPORTED_PROVIDERS) {
      const costs = parsedCost[provider];
      if (costs) {
        for (const cost of costs) {
          supportedCost[`${provider}/${cost.model}`] = { input: cost.input, output: cost.output };
        }
      }
    }

    yield* Redis.bulkSetProviderModelCost(supportedCost);
  });

const fetchModelsDev = () =>
  Effect.gen(function* () {
    const json: unknown = yield* fetchJson(MODELS_DEV_BASE);
    const supported = yield* processModelsDevModels(json);
    yield* processModelsDevCosts(json);
    return supported;
  });

const populate = () =>
  Effect.gen(function* () {
    const l = dataManagerLog("populate");

    yield* l.info("Starting data cache population", {
      categoryCount: CATEGORIES.length,
      orderCount: ORDERS.length,
    });

    const categoryFetches = CATEGORIES.flatMap((category) =>
      ORDERS.map((order) => fetchOpenRouterCategory(category, order)),
    );

    const [modelsDev, ...openRouter] = yield* Effect.all(
      [fetchModelsDev(), ...categoryFetches],
      { concurrency: "unbounded" },
    );

    const modelMap = generateModelMap(
      openRouter.flat() as string[],
      modelsDev as Readonly<Record<string, string[]>>,
    );

    yield* Redis.bulkSetProvidersForModels(modelMap);
    yield* Redis.markLastFetchPoint();

    yield* l.info("Data cache populated", { mapEntryCount: Object.keys(modelMap).length });
  });

export const runDataFetch = () =>
  Effect.gen(function* () {
    const l = dataManagerLog("runDataFetch");
    const lastFetchedAt = yield* Redis.getLastFetchPoint();

    if (lastFetchedAt) {
      yield* l.debug("Data cache is fresh, skipping fetch", {
        lastFetchedAt: new Date(lastFetchedAt).toISOString(),
        ttlHours: Duration.toHours(DATA_TTL),
      });
      return;
    }

    yield* l.info("Data cache stale or missing, performing fetch");
    yield* populate();
  });
