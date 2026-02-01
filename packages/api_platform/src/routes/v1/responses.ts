import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform";
import { Effect, Schema } from "effect";
import { ResponsesService } from "../../services/responses";
import { withProperContentTypeValidation } from "../../middlewares";

const ResponsesGetRoutePathParams = Schema.Struct({
  id: Schema.String,
});

const CreateResponsesBody = Schema.Struct({
  content: Schema.String,
});

export const responsesRouter = HttpRouter.empty.pipe(
  HttpRouter.post(
    "/",
    Effect.gen(function* () {
      const [createResponsesRequest, responsesService] = yield* Effect.all(
        [HttpServerRequest.schemaBodyJson(CreateResponsesBody), ResponsesService],
        { concurrency: "unbounded" },
      );
      const responsesObject = yield* responsesService.create(createResponsesRequest);
      return yield* HttpServerResponse.json(responsesObject);
    }),
  ),
  HttpRouter.use(withProperContentTypeValidation()),
  HttpRouter.get(
    "/:id",
    HttpRouter.schemaPathParams(ResponsesGetRoutePathParams).pipe(
      Effect.flatMap((params) => HttpServerResponse.json(params)),
    ),
  ),
);
