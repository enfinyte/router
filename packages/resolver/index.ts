import { Effect } from "effect";
import { runDataFetch, DATA_PATH } from "./data_manager";
import { resolveImpl } from "./resolver";
import type { ResponseCreateParams } from "./types";
import { BunContext, BunRuntime } from "@effect/platform-bun";

export const resolve = (options: ResponseCreateParams) =>
  Effect.gen(function* () {
    yield* runDataFetch(DATA_PATH);
    return yield* resolveImpl(options);
  });

BunRuntime.runMain(
  resolve({ model: "programming/most-popular" }).pipe(Effect.provide(BunContext.layer)),
);
