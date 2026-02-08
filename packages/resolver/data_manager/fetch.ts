import { Effect, Clock, Duration } from "effect";
import { FileSystem } from "@effect/platform/FileSystem";
import { DataFetchError } from "../types";
import { CATEGORIES, ORDERS } from "./const";

const OPENROUTER_BASE = "https://openrouter.ai/api/frontend/models";

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

const fetchAndWrite = (url: string, filePath: string) =>
  Effect.gen(function* () {
    const json = yield* fetchJson(url);
    const fs = yield* FileSystem;
    yield* fs.writeFileString(filePath, JSON.stringify(json));
  });

const makePaths = (path: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem;
    const exists = yield* fs.exists(path);
    if (exists) return;

    yield* fs.makeDirectory(path);
    yield* fs.writeFileString(`${path}/.last-fetch`, "");
    yield* Effect.forEach(CATEGORIES, (category) => fs.makeDirectory(`${path}/${category}`));
  });

const populate = (path: string) =>
  Effect.gen(function* () {
    const categoryFetches = CATEGORIES.flatMap((category) =>
      ORDERS.map((order) =>
        fetchAndWrite(openrouterCategoryUrl(category, order), `${path}/${category}/${order}.json`),
      ),
    );

    yield* Effect.all(
      [...categoryFetches, fetchAndWrite(OPENROUTER_BASE, `${path}/openrouter.json`)],
      { concurrency: "unbounded" },
    );
  });

export const runDataFetch = (dataPath: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem;
    yield* makePaths(dataPath);

    const ttlMillis = Duration.toMillis(DATA_TTL);
    const now = yield* Clock.currentTimeMillis;
    const lastFetchPath = `${dataPath}/.last-fetch`;
    const lastFetch = yield* fs.readFile(lastFetchPath).pipe(Effect.map((lf) => Number(lf)));

    const isStale = now - lastFetch >= ttlMillis;
    if (isStale) {
      yield* populate(dataPath);
      yield* fs.writeFileString(lastFetchPath, String(now));
    }
  });
