import { Effect } from "effect";
import { runDataFetch, DATA_PATH } from "./data_manager";
import { resolveImpl } from "./resolver";
import type { ResolvedResponse, CreateResponseBody } from "common";

export { ResolverLoggerLive } from "./logger";
export { getAvailableModels } from "./data_manager";

export const resolve = (
  options: CreateResponseBody,
  userProviders: string[],
  excludedResponses: ResolvedResponse[] = [],
  analysisTarget: string | undefined = undefined,
) =>
  Effect.gen(function* () {
    yield* Effect.logInfo("Resolve request received").pipe(
      Effect.annotateLogs({
        service: "Resolver",
        operation: "resolve",
        model: typeof options.model === "string" ? options.model : typeof options.model,
        providerCount: userProviders.length,
        excludedCount: excludedResponses.length,
        analysisTarget: analysisTarget ?? "per_prompt",
      }),
    );

    yield* runDataFetch(DATA_PATH);
    const result = yield* resolveImpl(options, userProviders, excludedResponses, analysisTarget);

    yield* Effect.logInfo("Resolve completed").pipe(
      Effect.annotateLogs({
        service: "Resolver",
        operation: "resolve",
        resolvedProvider: result.provider,
        resolvedModel: result.model,
      }),
    );

    return result;
  });
