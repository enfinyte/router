import { Effect, Data } from "effect";
import { ResolverService } from "resolver";
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
  Effect.gen(function* () {
    const resolverService = yield* ResolverService;
    return yield* resolverService.resolve(createResponseBody, userProviders, analysisTarget).pipe(
      Effect.mapError(
        (error) =>
          new PMRError({
            cause: error,
            message: "message" in error ? error.message : `Model resolution failed`,
          }),
      ),
    );
  });
