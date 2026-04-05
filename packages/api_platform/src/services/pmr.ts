import type { CreateResponseBody } from "common";

import { Effect, Data } from "effect";
import { ResolverService } from "@enfinyte/services";

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
    const startTime = Date.now();
    const pairs = yield* resolverService
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
    const resolutionLatencyMs = Date.now() - startTime;
    return { pairs, resolutionLatencyMs };
  });
