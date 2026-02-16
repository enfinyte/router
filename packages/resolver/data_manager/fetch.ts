import { Effect, Clock, Duration, Schema } from "effect";
import { FileSystem } from "@effect/platform/FileSystem";
import { DataFetchError } from "../types";
import {
  CATEGORIES,
  LAST_FETCH_PATH,
  MODELS_DEV_DATA_PATH,
  MODELS_MAP_DATA_PATH,
  ORDERS,
} from "./const";
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

    yield* fs.makeDirectory(path);
    yield* Effect.forEach(CATEGORIES, (category) => fs.makeDirectory(`${path}/${category}`));
  });

const populate = (path: string) =>
  Effect.gen(function* () {
    const openRouterAction = (path: string) => (json: any) =>
      Effect.gen(function* () {
        const parsed = yield* Schema.decodeUnknown(OpenRouterMapSchema)(json);
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
        const parsed = yield* Schema.decodeUnknown(ProviderModelMapSchema)(json);
        const supported = SUPPORTED_PROVIDERS.reduce((acc: object, provider: string) => {
          return Object.assign(acc, { [provider]: parsed[provider] });
        }, {});
        const fs = yield* FileSystem;
        yield* fs.writeFileString(path, JSON.stringify(supported, null, 2));
        return supported;
      });

    const [modelsDev, ...openRouter] = yield* Effect.all(
      [fetchAndAction(MODELS_DEV_BASE, modelsDevAction(MODELS_DEV_DATA_PATH)), ...categoryFetches],
      {
        concurrency: "unbounded",
      },
    );

    const modelMap = generateModelMap(
      openRouter.flat() as string[],
      modelsDev as Readonly<Record<string, string[]>>,
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
        return;
      }
    }

    yield* populate(dataPath);
    yield* fs.writeFileString(LAST_FETCH_PATH, String(now));
  });
