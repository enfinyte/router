import { Effect, Data, Either } from "effect";
import type { CreateResponseBody, ResponseResource } from "../responses/schema";
import {
  resolveReasoning,
  resolveTools,
  resolveToolChoice,
} from "./createResponseBodyFieldsToResponseResourceFieldsResolvers";
import {
  DEFAULT_BACKGROUND,
  DEFAULT_FREQUENCY_PENALTY,
  DEFAULT_PARALLEL_TOOL_CALLS,
  DEFAULT_PRESENCE_PENALTY,
  DEFAULT_SERVICE_TIER,
  DEFAULT_STORE,
  DEFAULT_TEMPERATURE,
  DEFAULT_TOP_LOGPROBS,
  DEFAULT_TOP_P,
  DEFAULT_TRUNCATION,
  MOCK_CACHED_TOKENS,
  MOCK_INPUT_TOKENS,
  MOCK_OUTPUT_TOKENS,
  MOCK_REASONING_TOKENS,
} from "./consts";
import * as pmrService from "../pmr";
import * as CredentialsService from "../credentials";
import { Providers } from "../types";
import { buildLanguageModelFromResolvedModelAndProvider } from "./buildLanguageModelFromResolvedModelAndProvider";
import { APICallError, generateText, type GenerateTextResult, type ToolSet } from "ai";
import { convertCreateResponseBodyInputFieldToCallSettingsMessages } from "./responseFieldsToAISDKGenerateTextCallSettingsAdapters";
import { convertAPICallErrorToResponseResource } from "./convertAPICallErrorToResponseResource";
import { convertAISdkGenerateTextResultToResponseResource } from "./convertAISdkGenerateTextResultToResponseResource";

export class AIServiceError extends Data.TaggedError("AIServiceError")<{
  cause?: unknown;
  message?: string;
}> {}

export const execute = (
  createResponseBody: CreateResponseBody,
  userId: string,
  userProviders: readonly string[],
) =>
  Effect.gen(function* () {
    const createdAt = Date.now();

    const requestedModel = createResponseBody.model;
    if (!requestedModel)
      // XXX: THIS SHOULD BE HANDLED BY ROUTE VALIDATION, BUT JUST IN CASE TO SATISFY TYPESCRIPT
      return yield* new AIServiceError({
        message: "`model` field is required or should not be empty",
      });

    const resolvedModelAndProvider = yield* pmrService
      .resolve(requestedModel, [...userProviders])
      .pipe(
        Effect.catchTag("PMRError", (err) =>
          Effect.fail(new AIServiceError({ cause: err, message: err.message })),
        ),
      );

    const credentials = yield* CredentialsService.getCredentials(
      userId,
      resolvedModelAndProvider.provider as Providers,
    ).pipe(
      Effect.catchTag("CredentialsError", (err) =>
        Effect.fail(new AIServiceError({ cause: err, message: err.message })),
      ),
    );

    const languageModel = yield* buildLanguageModelFromResolvedModelAndProvider(
      resolvedModelAndProvider,
      credentials,
    );

    const messages =
      yield* convertCreateResponseBodyInputFieldToCallSettingsMessages(createResponseBody);

    // NOTE: parallel_tool_calls, max_tool_calls, prompt_cache_key, truncation, top_logProbs
    const result = yield* Effect.either(
      Effect.tryPromise({
        try(abortSignal) {
          return generateText({
            model: languageModel,
            messages,
            abortSignal,
            ...(createResponseBody.max_output_tokens
              ? { maxOutputTokens: createResponseBody.max_output_tokens }
              : {}),
            ...(createResponseBody.top_p ? { topP: createResponseBody.top_p } : {}),
            ...(createResponseBody.temperature
              ? { temperature: createResponseBody.temperature }
              : {}),
            ...(createResponseBody.presence_penalty
              ? { presencePenalty: createResponseBody.presence_penalty }
              : {}),
            ...(createResponseBody.frequency_penalty
              ? { frequencyPenalty: createResponseBody.frequency_penalty }
              : {}),
          });
        },
        catch(error) {
          if (error instanceof APICallError) return error;
          return new AIServiceError({ cause: error, message: "Error while calling generateText" });
        },
      }),
    );

    if (Either.isLeft(result)) {
      const errorValue = result.left;

      if (errorValue instanceof AIServiceError) return yield* Effect.fail(errorValue);

      return yield* convertAPICallErrorToResponseResource({
        result: errorValue,
        createResponseBody,
        createdAt,
        resolvedModelAndProvider,
      });
    }

    return yield* convertAISdkGenerateTextResultToResponseResource({
      result: result.right,
      createResponseBody,
      createdAt,
      resolvedModelAndProvider,
    });
  });
