import { Effect, Data } from "effect";
import { resolve as resolverResolve } from "resolver";
import type { FileSystem } from "@effect/platform/FileSystem";
import type { CreateResponseBody, ResolvedResponse } from "common";

export class PMRError extends Data.TaggedError("PMRError")<{
  cause?: unknown;
  message?: string;
}> {}

export const resolve = (
  createResponseBody: CreateResponseBody,
  userProviders: string[],
  excludedResponses: ResolvedResponse[] = [],
  analysisTarget: string | undefined = undefined,
): Effect.Effect<ResolvedResponse, PMRError, FileSystem> =>
  resolverResolve(createResponseBody, userProviders, excludedResponses, analysisTarget).pipe(
    Effect.mapError(
      (error) =>
        new PMRError({
          cause: error,
          message: "message" in error ? error.message : `Model resolution failed`,
        }),
    ),
  );
