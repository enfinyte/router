import { Effect, Context, Data, Layer } from "effect";

export class ResponsesServiceErrror extends Data.TaggedError("ResponsesServiceErrror")<{
  cause?: unknown;
  message?: string;
}> {}

interface ResponsesServiceImpl {
  create: (createResponsesRequest: { content: string }) => Effect.Effect<
    {
      content: string;
      id: string;
      createdAt: number;
    },
    ResponsesServiceErrror,
    never
  >;
}

export class ResponsesService extends Context.Tag("Redis")<
  ResponsesService,
  ResponsesServiceImpl
>() {}

const make = () =>
  Effect.succeed(
    ResponsesService.of({
      create: (createResponsesRequest) =>
        Effect.gen(function* () {
          return yield* Effect.succeed({
            content: createResponsesRequest.content,
            id: "response_123",
            createdAt: Date.now(),
          });
        }),
    }),
  );

export const layer = () => Layer.scoped(ResponsesService, make());
