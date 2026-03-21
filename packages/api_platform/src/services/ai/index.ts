import type { TextStreamPart, ToolSet } from "ai";
import type { CreateResponseBody, ResolvedResponse, Providers } from "common";
import type { ProviderModelPair } from "resolver/src/types";

import { APICallError, generateText, streamText } from "ai";
import { Effect, Data, Either } from "effect";

import * as CredentialsService from "../credentials";
import * as pmrService from "../pmr";
import { buildLanguageModelFromResolvedModelAndProvider } from "./buildLanguageModelFromResolvedModelAndProvider";
import { convertAISdkGenerateTextResultToResponseResource } from "./convertAISdkGenerateTextResultToResponseResource";
import { convertAPICallErrorToResponseResource } from "./convertAPICallErrorToResponseResource";
import {
  convertCreateResponseBodyInputFieldToCallSettingsMessages,
  convertCreateResponseBodyToolsToCallSettingsTools,
  convertCreateResponseBodyToolChoiceToCallSettingsToolChoice,
  convertCreateResponseBodyTextFormatToCallSettingsOutput,
  convertCreateResponseBodyReasoningToProviderOptions,
} from "./responseFieldsToAISDKGenerateTextCallSettingsAdapters";

export class AIServiceError extends Data.TaggedError("AIServiceError")<{
  cause?: unknown;
  message?: string;
}> {}

export const execute = (
  createResponseBody: CreateResponseBody,
  userId: string,
  userProviders: readonly string[],
  fallbackProviderModelPair: ProviderModelPair | undefined,
  analysisTarget: string | undefined,
) =>
  Effect.gen(function* () {
    const requestedModel = createResponseBody.model;
    if (!requestedModel) {
      // XXX: THIS SHOULD BE HANDLED BY ROUTE VALIDATION, BUT JUST IN CASE TO SATISFY TYPESCRIPT
      return yield* new AIServiceError({
        message: "`model` field is required or should not be empty",
      });
    }
    const resolvedModelAndProvidersResult = yield* Effect.either(
      pmrService.resolve(createResponseBody, [...userProviders], analysisTarget),
    );

    if (Either.isLeft(resolvedModelAndProvidersResult)) {
      if (fallbackProviderModelPair) {
        return yield* callLanguageModel(userId, createResponseBody, fallbackProviderModelPair);
      }
      return yield* new AIServiceError({
        message: "Model resolution failed and no fallback provider is configured",
      });
    }

    const resolvedModelAndProviders = resolvedModelAndProvidersResult.right;

    for (const resolvedModelAndProvider of resolvedModelAndProviders) {
      const result = yield* Effect.either(
        callLanguageModel(userId, createResponseBody, resolvedModelAndProvider),
      );

      if (Either.isRight(result)) {
        const response = result.right;
        if (response.error === null) {
          return response;
        }
      }
    }

    if (fallbackProviderModelPair) {
      return yield* callLanguageModel(userId, createResponseBody, fallbackProviderModelPair);
    }

    return yield* new AIServiceError({
      message: "`model` field is required or should not be empty",
    });
  });

export const executeStream = (
  createResponseBody: CreateResponseBody,
  userId: string,
  userProviders: readonly string[],
  fallbackProviderModelPair: ProviderModelPair | undefined,
  analysisTarget: string | undefined,
) =>
  Effect.gen(function* () {
    const requestedModel = createResponseBody.model;
    if (!requestedModel) {
      // XXX: THIS SHOULD BE HANDLED BY ROUTE VALIDATION, BUT JUST IN CASE TO SATISFY TYPESCRIPT
      return yield* new AIServiceError({
        message: "`model` field is required or should not be empty",
      });
    }

    const resolvedModelAndProvidersResult = yield* Effect.either(
      pmrService.resolve(createResponseBody, [...userProviders], analysisTarget),
    );

    if (Either.isLeft(resolvedModelAndProvidersResult)) {
      if (fallbackProviderModelPair) {
        return yield* callLanguageModelStreaming(
          userId,
          createResponseBody,
          fallbackProviderModelPair,
        );
      }
      return yield* new AIServiceError({
        message: "Model resolution failed and no fallback provider is configured",
      });
    }

    const resolvedModelAndProviders = resolvedModelAndProvidersResult.right;

    for (const resolvedModelAndProvider of resolvedModelAndProviders) {
      const result = yield* Effect.either(
        callLanguageModelStreaming(userId, createResponseBody, resolvedModelAndProvider),
      );

      if (Either.isRight(result)) {
        // const response = result.right;
        // if (response.result === null) {
        return result.right;
        // }
      }
    }

    if (fallbackProviderModelPair) {
      return yield* callLanguageModelStreaming(
        userId,
        createResponseBody,
        fallbackProviderModelPair,
      );
    }

    return yield* new AIServiceError({
      message: "`model` field is required or should not be empty",
    });
  });

const callLanguageModel = (
  userId: string,
  createResponseBody: CreateResponseBody,
  resolvedModelAndProvider: ResolvedResponse,
) =>
  Effect.gen(function* () {
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

    const tools = convertCreateResponseBodyToolsToCallSettingsTools(
      createResponseBody.tools,
      createResponseBody.tool_choice,
    );

    const toolChoice = convertCreateResponseBodyToolChoiceToCallSettingsToolChoice(
      createResponseBody.tool_choice,
    );

    const outputFormat = convertCreateResponseBodyTextFormatToCallSettingsOutput(
      createResponseBody.text,
    );

    const hasStructuredOutput = createResponseBody.text?.format?.type === "json_schema";

    const providerOptions = convertCreateResponseBodyReasoningToProviderOptions(
      createResponseBody.reasoning,
      resolvedModelAndProvider.model,
      hasStructuredOutput,
    );

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
            ...(tools ? { tools } : {}),
            ...(toolChoice ? { toolChoice } : {}),
            ...(outputFormat ? { output: outputFormat } : {}),
            ...(providerOptions ? { providerOptions } : {}),
          }),
        catch(error) {
          if (error instanceof APICallError) return error;
          return new AIServiceError({
            cause: error,
            message: "Error while calling generateText",
          });
        },
      }),
    );

    if (Either.isLeft(result)) {
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

const callLanguageModelStreaming = (
  userId: string,
  createResponseBody: CreateResponseBody,
  resolvedModelAndProvider: ResolvedResponse,
) =>
  Effect.gen(function* () {
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

    const tools = convertCreateResponseBodyToolsToCallSettingsTools(
      createResponseBody.tools,
      createResponseBody.tool_choice,
    );

    const toolChoice = convertCreateResponseBodyToolChoiceToCallSettingsToolChoice(
      createResponseBody.tool_choice,
    );

    const outputFormat = convertCreateResponseBodyTextFormatToCallSettingsOutput(
      createResponseBody.text,
    );

    const hasStructuredOutput = createResponseBody.text?.format?.type === "json_schema";

    const providerOptions = convertCreateResponseBodyReasoningToProviderOptions(
      createResponseBody.reasoning,
      resolvedModelAndProvider.model,
      hasStructuredOutput,
    );

    void outputFormat;

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

    const streamResult = yield* Effect.either(
      Effect.tryPromise({
        try: async (abortSignal) => {
          const stream = streamText({
            ...generateTextOptions,
            abortSignal,
            ...(tools ? { tools } : {}),
            ...(toolChoice ? { toolChoice } : {}),
            ...(providerOptions ? { providerOptions } : {}),
          });

          // FIXME: very hack-y; find a diff way to error
          await stream.text;

          return Promise.resolve(stream);
        },
        catch(error) {
          if (error instanceof APICallError) return error;
          if (error instanceof AIServiceError) return error;
          return new AIServiceError({
            cause: error,
            message: "Error while calling streamText",
          });
        },
      }),
    );

    if (Either.isLeft(streamResult)) {
      const errorValue = streamResult.left;

      if (errorValue instanceof AIServiceError) {
        return yield* errorValue;
      }

      return yield* new AIServiceError({
        cause: errorValue,
        message: "Error while calling streamText",
      });
    }

    const streamIterator = streamResult.right.fullStream[Symbol.asyncIterator]();
    const firstChunkResult = yield* Effect.either(
      Effect.tryPromise<IteratorResult<TextStreamPart<ToolSet>>, AIServiceError>({
        try: () => streamIterator.next(),
        catch(error) {
          if (error instanceof AIServiceError) return error;
          return new AIServiceError({
            cause: error,
            message: "Error while reading first stream chunk",
          });
        },
      }),
    );

    if (Either.isLeft(firstChunkResult)) {
      return yield* firstChunkResult.left;
    }

    const firstChunk = firstChunkResult.right;

    if (!firstChunk.done && firstChunk.value.type === "error") {
      return yield* new AIServiceError({
        cause: firstChunk.value,
        message: "Error while reading first stream chunk",
      });
    }

    async function* reconstitutedStream() {
      if (!firstChunk.done) {
        yield firstChunk.value;
      }
      yield* {
        [Symbol.asyncIterator]: () => streamIterator,
      };
    }

    return {
      stream: reconstitutedStream(),
      result: streamResult.right,
      resolvedModelAndProvider,
    };
  });
