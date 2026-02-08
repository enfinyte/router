import { Effect, Clock } from "effect";
import { FileSystem } from "@effect/platform/FileSystem";
import { CATEGORIES, ORDERS } from "./const";
const OPENROUTER = `https://openrouter.ai/api/frontend/models`;

const OPENROUTER_FIND_CATEGORY_ORDER = (category: string, order: string) => {
  if (category == "seo") {
    return `https://openrouter.ai/api/frontend/models/find?categories=marketing/seo&order=${order}`;
  }
  return `https://openrouter.ai/api/frontend/models/find?categories=${category}&order=${order}`;
};

const modelsdev = (path: string) =>
  Effect.gen(function* () {
    const MODELS_DEV_URL = "https://models.dev/api.json";
    const response = yield* Effect.tryPromise({
      try: () => fetch(MODELS_DEV_URL),
      catch: (error) => new Error(`API call failed: ${error}`),
    });

    const json = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: (error) => new Error(`JSON parsing failed: ${error}`),
    });

    const fs = yield* FileSystem;

    yield* fs.writeFileString(`${path}/models_dev.json`, JSON.stringify(json));
  });

const openrouterAllModels = (path: string) =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () => fetch(OPENROUTER),
      catch: (error) => new Error(`API call failed: ${error}`),
    });

    const json = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: (error) => new Error(`JSON parsing failed: ${error}`),
    });

    const fs = yield* FileSystem;

    yield* fs.writeFileString(`${path}/openrouter.json`, JSON.stringify(json));
  });

const openrouterCategoryOrder = (path: string, category: string, order: string) =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () => fetch(OPENROUTER_FIND_CATEGORY_ORDER(category, order)),
      catch: (error) => new Error(`API call failed: ${error}`),
    });

    const json = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: (error) => new Error(`JSON parsing failed: ${error}`),
    });

    const fs = yield* FileSystem;

    yield* fs.writeFileString(`${path}/${category}/${order}.json`, JSON.stringify(json));
  });

const generateCategoryOrderPair = Effect.gen(function* () {
  const pairs = CATEGORIES.map((category) => {
    return ORDERS.map((order) => [category, order]);
  });

  return pairs.flat();
});

const generateOpenRouterFetches = (path: string, pairs: string[][]) => {
  return pairs.map(([category, order]) => openrouterCategoryOrder(path, category!, order!));
};

const makePaths = (path: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem;
    const exists = yield* fs.exists(path);
    if (exists) {
      return;
    }

    yield* fs.makeDirectory(path);
    yield* fs.writeFileString(`${path}/.last-fetch`, "");
    yield* Effect.forEach(CATEGORIES, (category, _) => fs.makeDirectory(`${path}/${category}`));
  });

const populate = (path: string) =>
  Effect.gen(function* () {
    const pairs = yield* generateCategoryOrderPair;
    const fetches = generateOpenRouterFetches(path, pairs);
    fetches.push(modelsdev(path));
    fetches.push(openrouterAllModels(path));

    yield* Effect.all(fetches, {
      concurrency: "unbounded",
    });
  });

export const runDataFetch = (dataPath: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem;
    yield* makePaths(dataPath);

    const TTL = 12 * 60 * 60 * 1000;
    const now = yield* Clock.currentTimeMillis;
    const lastFetchPath = `${dataPath}/.last-fetch`;
    const lastFetch = yield* fs.readFile(lastFetchPath).pipe(Effect.map((lf) => Number(lf)));

    const isStale = now - lastFetch >= TTL;
    if (isStale) {
      yield* populate(dataPath);
      yield* fs.writeFileString(lastFetchPath, String(now));
    }
  });
