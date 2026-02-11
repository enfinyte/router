import { Effect } from "effect";
import { runDataFetch, DATA_PATH } from "./data_manager";
import { resolveImpl } from "./resolver";
import type { ResponseCreateParams } from "./types";

export const resolve = (options: ResponseCreateParams, userProviders: string[]) =>
  Effect.gen(function* () {
    yield* runDataFetch(DATA_PATH);
    return yield* resolveImpl(options, userProviders);
  });

import { BunContext, BunRuntime } from "@effect/platform-bun";
BunRuntime.runMain(
  resolve({ model: "auto", input: "What is the Reimann Hypothesis?" }, ["amazon-bedrock"]).pipe(
    Effect.tap(Effect.log),
    Effect.provide(BunContext.layer),
  ),
);
