import { Effect, Data, Either } from "effect";
import type { CreateResponseBody, ResponseResource } from "common";
import * as pmrService from "../pmr";
import * as CredentialsService from "../credentials";
import { Providers } from "common";
import { buildLanguageModelFromResolvedModelAndProvider } from "./buildLanguageModelFromResolvedModelAndProvider";
import { APICallError, generateText } from "ai";
import { convertCreateResponseBodyInputFieldToCallSettingsMessages } from "./responseFieldsToAISDKGenerateTextCallSettingsAdapters";
import { convertAPICallErrorToResponseResource } from "./convertAPICallErrorToResponseResource";
import { convertAISdkGenerateTextResultToResponseResource } from "./convertAISdkGenerateTextResultToResponseResource";
import type { ResolvedResponse } from "common";
import type { FileSystem } from "@effect/platform/FileSystem";
import type { VaultService } from "vault";

export class AIServiceError extends Data.TaggedError("AIServiceError")<{
  cause?: unknown | "PMRDepthReached";
  message?: string;
}> {}

export const execute = (
  createResponseBody: CreateResponseBody,
  userId: string,
  userProviders: readonly string[],
) => pmrRoutine(createResponseBody, userId, userProviders, []);

const pmrRoutine = (
  createResponseBody: CreateResponseBody,
  userId: string,
  userProviders: readonly string[],
  excludedProviders: ResolvedResponse[],
): Effect.Effect<ResponseResource, AIServiceError, FileSystem | VaultService> =>
  Effect.gen(function* () {
    const requestedModel = createResponseBody.model;
    if (!requestedModel) {
      // XXX: THIS SHOULD BE HANDLED BY ROUTE VALIDATION, BUT JUST IN CASE TO SATISFY TYPESCRIPT
      return yield* new AIServiceError({
        message: "`model` field is required or should not be empty",
      });
    }

    const resolvedModelResult = yield* pmrService
      .resolve(createResponseBody, [...userProviders], excludedProviders)
      .pipe(Effect.either);

    const isLastAttempt = Either.isLeft(resolvedModelResult);

    const resolvedModelAndProvider = isLastAttempt
      ? // NOTE: grab this from onboarding
        { model: "", provider: "" }
      : resolvedModelResult.right;

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
    const generateTextOptions = {
      model: languageModel,
      messages,
      ...(createResponseBody.max_output_tokens && {
        maxOutputTokens: createResponseBody.max_output_tokens,
      }),
      ...(createResponseBody.top_p && { topP: createResponseBody.top_p }),
      ...(createResponseBody.temperature && { temperature: createResponseBody.temperature }),
      ...(createResponseBody.presence_penalty && {
        presencePenalty: createResponseBody.presence_penalty,
      }),
      ...(createResponseBody.frequency_penalty && {
        frequencyPenalty: createResponseBody.frequency_penalty,
      }),
    };

    const result = yield* Effect.either(
      Effect.tryPromise({
        try: (abortSignal) =>
          generateText({
            ...generateTextOptions,
            abortSignal,
          }),
        catch: (error) => {
          if (error instanceof APICallError) return error;
          return new AIServiceError({
            cause: error,
            message: "Error while calling generateText",
          });
        },
      }),
    );

    if (Either.isLeft(result)) {
      if (!isLastAttempt) {
        return yield* pmrRoutine(createResponseBody, userId, userProviders, [
          ...excludedProviders,
          resolvedModelAndProvider,
        ]);
      }

      const errorValue = result.left;

      if (errorValue instanceof AIServiceError) {
        return yield* errorValue;
      }

      return yield* convertAPICallErrorToResponseResource({
        result: errorValue,
        createResponseBody,
        createdAt: Date.now(),
        resolvedModelAndProvider,
      });
    }

    return yield* convertAISdkGenerateTextResultToResponseResource({
      result: result.right,
      createResponseBody,
      createdAt: Date.now(),
      resolvedModelAndProvider,
    });
  });
