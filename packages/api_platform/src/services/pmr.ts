import { Effect, Data } from "effect";
import { resolve as resolverResolve } from "resolver";
import type { CreateResponseBody } from "common";

export class PMRError extends Data.TaggedError("PMRError")<{
  cause?: unknown;
  message?: string;
}> {}

export const resolve = (
  createResponseBody: CreateResponseBody,
  userProviders: string[],
  analysisTarget: string | undefined = undefined,
) =>
  resolverResolve(createResponseBody, userProviders, analysisTarget).pipe(
    Effect.mapError(
      (error) =>
        new PMRError({
          cause: error,
          message: "message" in error ? error.message : `Model resolution failed`,
        }),
    ),
  );
