import { Effect, Clock, Duration, Schema } from "effect";
import { FileSystem } from "@effect/platform/FileSystem";
import { DataFetchError } from "../types";
import { LAST_FETCH_PATH, MODELS_DEV_DATA_PATH, MODELS_MAP_DATA_PATH } from "./const";
import { ORDERS, CATEGORIES } from "../types";
import { SUPPORTED_PROVIDERS } from "common";
import { ProviderModelMapSchema } from "./schema/modelsdev";
import { OpenRouterMapSchema } from "./schema/openrouter";
import { generateModelMap } from "./model_map";

const OPENROUTER_BASE = "https://openrouter.ai/api/frontend/models";
const MODELS_DEV_BASE = "https://models.dev/api.json";

const DATA_TTL = Duration.hours(12);

const openrouterCategoryUrl = (category: string, order: string) => {
  const cat = category === "seo" ? "marketing/seo" : category;
  return `${OPENROUTER_BASE}/find?categories=${cat}&order=${order}`;
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

const fetchAndAction = (url: string, action: (json: any) => Effect.Effect<unknown, any, any>) =>
  Effect.gen(function* () {
    const json = yield* fetchJson(url);
    return yield* action(json);
  });

const makePaths = (path: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem;
    const exists = yield* fs.exists(path);
    if (exists) return;

    yield* Effect.logInfo("Creating data directory structure").pipe(
      Effect.annotateLogs({ service: "DataManager", operation: "makePaths", path }),
    );

    yield* fs.makeDirectory(path);
    yield* Effect.forEach(CATEGORIES, (category) => fs.makeDirectory(`${path}/${category}`));

    yield* Effect.logDebug("Data directory structure created").pipe(
      Effect.annotateLogs({
        service: "DataManager",
        operation: "makePaths",
        path,
        categoryCount: CATEGORIES.length,
      }),
    );
  });

const populate = (path: string) =>
  Effect.gen(function* () {
    yield* Effect.logInfo("Populating data cache").pipe(
      Effect.annotateLogs({ service: "DataManager", operation: "populate" }),
    );

    const openRouterAction = (path: string) => (json: any) =>
      Effect.gen(function* () {
        const parsed = yield* Schema.decodeUnknown(OpenRouterMapSchema)(json).pipe(
          Effect.tapError((err) =>
            Effect.logError("OpenRouter schema decode failed").pipe(
              Effect.annotateLogs({
                service: "DataManager",
                operation: "populate",
                path,
                cause: String(err),
              }),
            ),
          ),
        );
        const fs = yield* FileSystem;
        yield* fs.writeFileString(path, JSON.stringify(parsed, null, 2));
        return parsed;
      });

    const categoryFetches = CATEGORIES.flatMap((category) =>
      ORDERS.map((order) =>
        fetchAndAction(
          openrouterCategoryUrl(category, order),
          openRouterAction(`${path}/${category}/${order}.json`),
        ),
      ),
    );

    const modelsDevAction = (path: string) => (json: any) =>
      Effect.gen(function* () {
        const parsed = yield* Schema.decodeUnknown(ProviderModelMapSchema)(json).pipe(
          Effect.tapError((err) =>
            Effect.logError("models.dev schema decode failed").pipe(
              Effect.annotateLogs({
                service: "DataManager",
                operation: "populate",
                path,
                cause: String(err),
              }),
            ),
          ),
        );
        const supported = SUPPORTED_PROVIDERS.reduce((acc: object, provider: string) => {
          return Object.assign(acc, { [provider]: parsed[provider] });
        }, {});
        const fs = yield* FileSystem;
        yield* fs.writeFileString(path, JSON.stringify(supported, null, 2));
        return supported;
      });

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
      [fetchAndAction(MODELS_DEV_BASE, modelsDevAction(MODELS_DEV_DATA_PATH)), ...categoryFetches],
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

    const fs = yield* FileSystem;
    yield* fs.writeFileString(MODELS_MAP_DATA_PATH, JSON.stringify(modelMap, null, 2));
  });

export const runDataFetch = (dataPath: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem;
    yield* makePaths(dataPath);

    const ttlMillis = Duration.toMillis(DATA_TTL);
    const now = yield* Clock.currentTimeMillis;

    const lastFetchExists = yield* fs.exists(LAST_FETCH_PATH);

    if (lastFetchExists) {
      const lastFetch = yield* fs.readFile(LAST_FETCH_PATH).pipe(Effect.map((lf) => Number(lf)));
      const isStale = now - lastFetch >= ttlMillis;
      if (!isStale) {
        const ageHours = Math.round((now - lastFetch) / 3_600_000 * 10) / 10;
        yield* Effect.logDebug("Data cache is fresh, skipping fetch").pipe(
          Effect.annotateLogs({
            service: "DataManager",
            operation: "runDataFetch",
            ageHours,
            ttlHours: Duration.toHours(DATA_TTL),
          }),
        );
        return;
      }
      yield* Effect.logInfo("Data cache is stale, refreshing").pipe(
        Effect.annotateLogs({
          service: "DataManager",
          operation: "runDataFetch",
          ttlHours: Duration.toHours(DATA_TTL),
        }),
      );
    } else {
      yield* Effect.logInfo("No data cache found, performing initial fetch").pipe(
        Effect.annotateLogs({ service: "DataManager", operation: "runDataFetch" }),
      );
    }

    yield* populate(dataPath);
    yield* fs.writeFileString(LAST_FETCH_PATH, String(now));

    yield* Effect.logInfo("Data cache refreshed").pipe(
      Effect.annotateLogs({ service: "DataManager", operation: "runDataFetch" }),
    );
  });
