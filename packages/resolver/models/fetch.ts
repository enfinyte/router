import { Effect, Clock, Console } from "effect";
import { FileSystem } from "@effect/platform/FileSystem";
import { BunContext, BunRuntime } from "@effect/platform-bun";
import { CATEGORIES, ORDERS } from "./schema";

const OPENROUTER_URL = (category: string, order: string) =>
  `https://openrouter.ai/api/frontend/models/find?categories=${category}&order=${order}`;

const openrouter = (category: string, order: string) =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () => fetch(OPENROUTER_URL(category, order)),
      catch: (error) => new Error(`API call failed: ${error}`),
    });

    const json = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: (error) => new Error(`JSON parsing failed: ${error}`),
    });

    const fs = yield* FileSystem;

    yield* fs.writeFileString(`${__dirname}/${category}/${order}.json`, JSON.stringify(json));
  });

const generateCategoryOrderPair = Effect.gen(function* () {
  const pairs = CATEGORIES.map((category) => {
    return ORDERS.map((order) => [category, order]);
  });

  return pairs.flat();
});

const generateFetches = (pairs: string[][]) => {
  return pairs.map(([category, order]) => openrouter(category!, order!));
};

const makePaths = Effect.gen(function* () {
  const fs = yield* FileSystem;
  const lastFetchPath = `${__dirname}/.last-fetch`;
  const exists = yield* fs.exists(lastFetchPath);

  if (exists) {
    return;
  }

  yield* fs.writeFileString(lastFetchPath, "");

  Effect.forEach([1, 2, 3, 4, 5], (n, index) =>
    Console.log(`Currently at index ${index}`).pipe(Effect.as(n * 2)),
  );

  yield* Effect.forEach(CATEGORIES, (category, _) => fs.makeDirectory(`${__dirname}/${category}`));
});

const populate = Effect.gen(function* () {
  const pairs = yield* generateCategoryOrderPair;
  const fetches = generateFetches(pairs);

  yield* Effect.all(fetches, {
    concurrency: "unbounded",
  });
});

export const program = Effect.gen(function* () {
  const fs = yield* FileSystem;
  yield* makePaths;

  const TTL = 12 * 60 * 60 * 1000;
  const now = yield* Clock.currentTimeMillis;

  const lastFetchPath = `${__dirname}/.last-fetch`;

  const lastFetch = yield* fs.readFile(lastFetchPath).pipe(Effect.map((lf) => Number(lf)));
  const isStale = now - lastFetch >= TTL;
  if (isStale) {
    yield* populate;
    yield* fs.writeFileString(lastFetchPath, String(now));
  }
});

export const runModelFetch = Effect.sync(() =>
  BunRuntime.runMain(program.pipe(Effect.provide(BunContext.layer))),
);
