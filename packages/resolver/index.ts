import { Effect } from "effect";
import { runDataFetch, DATA_PATH } from "./data_manager";
import { resolveImpl } from "./resolver";
import type { ResolvedResponse, ResponseCreateParams } from "./types";

export const resolve = (
  options: ResponseCreateParams,
  userProviders: string[],
  excludedResponses: ResolvedResponse[] = [],
) =>
  Effect.gen(function* () {
    yield* runDataFetch(DATA_PATH);
    return yield* resolveImpl(options, userProviders, excludedResponses);
  });

import { BunContext, BunRuntime } from "@effect/platform-bun";
BunRuntime.runMain(
  resolve(
    { model: "programming/most-popular", input: "What is the Reimann Hypothesis?" },
    ["amazon-bedrock"],
    [
      {
        model: "moonshotai.kimi-k2.5",
        provider: "amazon-bedrock",
      },
    ],
  ).pipe(Effect.tap(Effect.log), Effect.provide(BunContext.layer)),
);
