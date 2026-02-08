import { Effect } from "effect";
import { runDataFetch, DATA_PATH } from "./data_manager";
import { resolveImpl } from "./resolver";
import type { ResponseCreateParams } from "./types";

export const resolve = (options: ResponseCreateParams, userProviders: string[]) =>
  Effect.gen(function* () {
    yield* runDataFetch(DATA_PATH);
    return yield* resolveImpl(options, userProviders);
  });

// Testing
// import { BunContext, BunRuntime } from "@effect/platform-bun";
// BunRuntime.runMain(
//   resolve({ model: "programming/most-popular" }, ["openai", "anthropic"]).pipe(
//     Effect.provide(BunContext.layer),
//   ),
// );
