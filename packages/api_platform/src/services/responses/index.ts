import { Effect, Data } from "effect";
import type { CreateResponseBody, ResponseResource } from "./schema";
import * as AIService from "../ai";
import * as DatabaseService from "../database";

export class ResponseServiceError extends Data.TaggedError("ResponseServiceError")<{
  cause?: unknown;
  message?: string;
}> {}

export const create = (req: CreateResponseBody) =>
  Effect.gen(function* () {
    const responseResource = yield* AIService.makeRequest(req);
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
  Effect.gen(function* () {
    return yield* DatabaseService.createResponsesResource(resource);
  });

const getResponseResourceByIdFromDatabase = (responseId: string) =>
  Effect.gen(function* () {
    return yield* DatabaseService.getResponsesResourceById(responseId);
  });
