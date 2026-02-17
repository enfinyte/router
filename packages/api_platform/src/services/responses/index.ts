import { Effect, Data } from "effect";
import type { CreateResponseBody, ResponseResource } from "common";
import * as AIService from "../ai";
import * as DatabaseService from "../database";

export class ResponseServiceError extends Data.TaggedError("ResponseServiceError")<{
  cause?: unknown;
  message?: string;
}> {}

export const create = (
  req: CreateResponseBody,
  userId: string,
  userProviders: readonly string[],
  fallbackProviderModelPair: string | undefined,
  analysisTarget: string | undefined,
) =>
  Effect.gen(function* () {
    const responseResource = yield* AIService.execute(req, userId, userProviders, fallbackProviderModelPair, analysisTarget);
    yield* persistResponseResourceInDatabase(responseResource);
    return responseResource;
  }).pipe(
    Effect.catchTags({
      AIServiceError: (err) =>
        Effect.fail(new ResponseServiceError({ cause: err, message: err.message })),
      DatabaseServiceError: (err) =>
        Effect.fail(new ResponseServiceError({ cause: err, message: err.message })),
    }),
  );

const persistResponseResourceInDatabase = (resource: ResponseResource) =>
  DatabaseService.createResponsesResource(resource);

export const getResponseResourceByIdFromDatabase = (responseId: string) =>
  DatabaseService.getResponsesResourceById(responseId);
