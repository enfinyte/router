import { Effect, Data } from "effect";
import { resolve as resolverResolve } from "resolver";
import type { FileSystem } from "@effect/platform/FileSystem";

export class PMRError extends Data.TaggedError("PMRError")<{
  cause?: unknown;
  message?: string;
}> {}

export interface ResolvedModel {
  readonly provider: string;
  readonly model: string;
}

export const resolve = (
  model: string,
  userProviders: string[],
): Effect.Effect<ResolvedModel, PMRError, FileSystem> =>
  resolverResolve({ model }, userProviders).pipe(
    Effect.mapError(
      (error) =>
        new PMRError({
          cause: error,
          message: "message" in error ? error.message : `Model resolution failed`,
        }),
    ),
  );
