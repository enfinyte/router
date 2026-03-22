import type { CreateResponseBody } from "common";

import { Effect, Data } from "effect";
import { ResolverService } from "resolver";

export class PMRError extends Data.TaggedError("PMRError")<{
  cause?: unknown;
  message?: string;
}> {}

export const resolve = (
  createResponseBody: CreateResponseBody,
  userId: string,
  userProviders: string[],
  analysisTarget: string,
) =>
  Effect.gen(function* () {
    const resolverService = yield* ResolverService;
    return yield* resolverService
      .resolve(createResponseBody, userId, userProviders, analysisTarget)
      .pipe(
        Effect.mapError(
          (error) =>
            new PMRError({
              cause: error,
              message: "message" in error ? error.message : `Model resolution failed`,
            }),
        ),
      );
  });
