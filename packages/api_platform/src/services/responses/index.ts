import { Effect, Data } from "effect";
import type { CreateResponseBody, ResponseResource } from "./schema";
import * as AIService from "../ai";
import { DatabaseService } from "../database";

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
      // DatabaseServiceError: (err) =>
      //   Effect.fail(new ResponseServiceError({ cause: err, message: err.message })),
    }),
  );

const persistResponseResourceInDatabase = (resource: ResponseResource) =>
  Effect.gen(function* () {
    const _ = yield* DatabaseService;
    return resource;
  });

const getResponseResourceByIdFromDatabase = (id: string) =>
  Effect.gen(function* () {
    const _ = yield* DatabaseService;
    return {} as ResponseResource;
  });
