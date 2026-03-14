import { Effect } from "effect";
import { runDataFetch, DATA_PATH } from "./data_manager";
import { resolveImpl } from "./resolver";
import type { CreateResponseBody } from "common";

export { ResolverLoggerLive } from "./logger";
export { getAvailableModels } from "./data_manager";

export * from "./types";

export const resolve = (
  options: CreateResponseBody,
  userProviders: string[],
  analysisTarget: string | undefined,
) =>
  Effect.gen(function* () {
    yield* Effect.logInfo("Resolve request received").pipe(
      Effect.annotateLogs({
        service: "Resolver",
        operation: "resolve",
        model: typeof options.model === "string" ? options.model : typeof options.model,
        providerCount: userProviders.length,
        analysisTarget: analysisTarget ?? "per_prompt",
      }),
    );

    yield* runDataFetch(DATA_PATH);
    const pairs = yield* resolveImpl(options, userProviders, analysisTarget);

    yield* Effect.logInfo("Resolve completed").pipe(
      Effect.annotateLogs({
        service: "Resolver",
        operation: "resolve",
        pairs: pairs,
      }),
    );

    return pairs;
  });
