import { HttpRouter, HttpServerRequest, HttpServerResponse } from "@effect/platform";
import { Data, Effect, Schema } from "effect";
import { ResponseService } from "../../services/responses";
import { withProperContentTypeValidation } from "../../middlewares";
import { CreateResponseBodySchema, type CreateResponseBody } from "../../services/responses/schema";

const MIN_TEMPERATURE = 0;
const MAX_TEMPERATURE = 2;
const MIN_TOP_P = 0;
const MAX_TOP_P = 1;
const MIN_PENALTY = -2;
const MAX_PENALTY = 2;
const MIN_TOP_LOGPROBS = 0;
const MAX_TOP_LOGPROBS = 20;

class RequestValidationError extends Data.TaggedError("RequestValidationError")<{
  message: string;
}> {}

const ResponsesGetRoutePathParams = Schema.Struct({
  id: Schema.String,
});

const validateCreateResponseBody = (
  body: CreateResponseBody,
): Effect.Effect<void, RequestValidationError> => {
  if (!body.model)
    return Effect.fail(new RequestValidationError({ message: "`model` field is required" }));

  if (
    body.temperature != null &&
    (body.temperature < MIN_TEMPERATURE || body.temperature > MAX_TEMPERATURE)
  )
    return Effect.fail(
      new RequestValidationError({
        message: `\`temperature\` must be between ${MIN_TEMPERATURE} and ${MAX_TEMPERATURE}`,
      }),
    );

  if (body.top_p != null && (body.top_p < MIN_TOP_P || body.top_p > MAX_TOP_P))
    return Effect.fail(
      new RequestValidationError({
        message: `\`top_p\` must be between ${MIN_TOP_P} and ${MAX_TOP_P}`,
      }),
    );

  if (
    body.presence_penalty != null &&
    (body.presence_penalty < MIN_PENALTY || body.presence_penalty > MAX_PENALTY)
  )
    return Effect.fail(
      new RequestValidationError({
        message: `\`presence_penalty\` must be between ${MIN_PENALTY} and ${MAX_PENALTY}`,
      }),
    );

  if (
    body.frequency_penalty != null &&
    (body.frequency_penalty < MIN_PENALTY || body.frequency_penalty > MAX_PENALTY)
  )
    return Effect.fail(
      new RequestValidationError({
        message: `\`frequency_penalty\` must be between ${MIN_PENALTY} and ${MAX_PENALTY}`,
      }),
    );

  if (
    body.top_logprobs != null &&
    (body.top_logprobs < MIN_TOP_LOGPROBS || body.top_logprobs > MAX_TOP_LOGPROBS)
  )
    return Effect.fail(
      new RequestValidationError({
        message: `\`top_logprobs\` must be between ${MIN_TOP_LOGPROBS} and ${MAX_TOP_LOGPROBS}`,
      }),
    );

  if (body.max_output_tokens != null && body.max_output_tokens <= 0)
    return Effect.fail(
      new RequestValidationError({ message: "`max_output_tokens` must be a positive number" }),
    );

  return Effect.void;
};

export const responsesRouter = HttpRouter.empty.pipe(
  HttpRouter.post(
    "/",
    Effect.gen(function* () {
      const [createResponseBody, responsesService] = yield* Effect.all(
        [HttpServerRequest.schemaBodyJson(CreateResponseBodySchema), ResponseService],
        { concurrency: "unbounded" },
      );
      yield* validateCreateResponseBody(createResponseBody);
      const responsesObject = yield* responsesService.create(createResponseBody);
      return yield* HttpServerResponse.json(responsesObject);
    }).pipe(
      Effect.catchTag("RequestValidationError", (err) =>
        HttpServerResponse.json({ error: { message: err.message } }, { status: 400 }),
      ),
    ),
  ),
  HttpRouter.use(withProperContentTypeValidation()),
  HttpRouter.get(
    "/:id",
    HttpRouter.schemaPathParams(ResponsesGetRoutePathParams).pipe(
      Effect.flatMap((params) => HttpServerResponse.json(params)),
    ),
  ),
);
