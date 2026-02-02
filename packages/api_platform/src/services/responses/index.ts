import { Effect, Context, Data, Layer } from "effect";
import type { CreateResponseBody, ResponseResource } from "./schema";
import { AIService } from "../ai";
import { DatabaseService } from "../database";

export class ResponseServiceError extends Data.TaggedError("ResponseServiceError")<{
  cause?: unknown;
  message?: string;
}> {}

interface ResponseServiceImpl {
  create: (
    createResponseBody: CreateResponseBody,
  ) => Effect.Effect<ResponseResource, ResponseServiceError, never>;
}

export class ResponseService extends Context.Tag("ResponsesService")<
  ResponseService,
  ResponseServiceImpl
>() {}

const make = () =>
  Effect.gen(function* () {
    const aiService = yield* AIService;
    const databaseService = yield* DatabaseService;
    return ResponseService.of({
      create: (req) =>
        Effect.gen(function* () {
          const responseResource = yield* aiService.makeRequest(req);
          yield* databaseService.persist(responseResource);
          return responseResource;
        }).pipe(
          Effect.catchTags({
            AIServiceError: (err) =>
              Effect.fail(new ResponseServiceError({ cause: err, message: err.message })),
            DatabaseServiceError: (err) =>
              Effect.fail(new ResponseServiceError({ cause: err, message: err.message })),
          }),
        ),
    });
  });

export const ResponseServiceLive = Layer.effect(ResponseService, make());
