import { Effect, Context, Data, Layer, Schema } from "effect";
import type { components } from "./model";

type requestBody = components["schemas"]["CreateResponseBody"];

const CreateResponseBodySchema = Schema.Struct<requestBody>({});

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

export class ResponsesService extends Context.Tag("ResponsesService")<
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
