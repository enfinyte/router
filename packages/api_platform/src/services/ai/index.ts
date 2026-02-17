import { Effect, Data, Either } from "effect";
import type { CreateResponseBody, ResponseResource, ResolvedResponse, Providers } from "common";
import * as pmrService from "../pmr";
import * as CredentialsService from "../credentials";
import { buildLanguageModelFromResolvedModelAndProvider } from "./buildLanguageModelFromResolvedModelAndProvider";
import { APICallError, generateText, streamText } from "ai";
import type { TextStreamPart, ToolSet } from "ai";
import {
  convertCreateResponseBodyInputFieldToCallSettingsMessages,
  convertCreateResponseBodyToolsToCallSettingsTools,
  convertCreateResponseBodyToolChoiceToCallSettingsToolChoice,
  convertCreateResponseBodyTextFormatToCallSettingsOutput,
  convertCreateResponseBodyReasoningToProviderOptions,
} from "./responseFieldsToAISDKGenerateTextCallSettingsAdapters";
import { convertAPICallErrorToResponseResource } from "./convertAPICallErrorToResponseResource";
import { convertAISdkGenerateTextResultToResponseResource } from "./convertAISdkGenerateTextResultToResponseResource";
import type { FileSystem } from "@effect/platform/FileSystem";
import type { VaultService } from "vault";
import { classificationCache } from "../classification-cache";

export class AIServiceError extends Data.TaggedError("AIServiceError")<{
  cause?: unknown | "PMRDepthReached";
  message?: string;
}> {}

const HARDCODED_FALLBACK = {
  model: "global.anthropic.claude-haiku-4-5-20251001-v1:0",
  provider: "amazon-bedrock",
} as const;

const parseFallbackPair = (
  pair: string | undefined,
): { provider: string; model: string } | undefined => {
  if (!pair) return undefined;
  const slashIndex = pair.indexOf("/");
  if (slashIndex === -1) return undefined;
  const provider = pair.slice(0, slashIndex);
  const model = pair.slice(slashIndex + 1);
  if (!provider || !model) return undefined;
  return { provider, model };
};

/**
 * Extracts system/developer prompt text from the request input.
 * Used as the cache key for "per_system_prompt" analysis target.
 */
const extractSystemPromptText = (
  input: CreateResponseBody["input"],
  instructions: string | undefined,
): string | null => {
  if (Array.isArray(input)) {
    const text = input
      .filter((item) => item.role === "system" || item.role === "developer")
      .map((item) => item.content.text)
      .join(" ");
    if (text) return text;
  }

  if (typeof instructions === "string" && instructions.length > 0) return instructions;

  return null;
};

type StreamResult = ReturnType<typeof streamText>;

export const execute = (
  createResponseBody: CreateResponseBody,
  userId: string,
  userProviders: readonly string[],
  fallbackProviderModelPair: string | undefined,
  analysisTarget: string | undefined,
) =>
  pmrRoutine(
    createResponseBody,
    userId,
    userProviders,
    [],
    fallbackProviderModelPair,
    analysisTarget,
  );

export const executeStream = (
  createResponseBody: CreateResponseBody,
  userId: string,
  userProviders: readonly string[],
): Effect.Effect<
  {
    stream: AsyncIterable<TextStreamPart<ToolSet>>;
    result: StreamResult;
    resolvedModelAndProvider: ResolvedResponse;
  },
  AIServiceError,
  FileSystem | VaultService
> => pmrStreamRoutine(createResponseBody, userId, userProviders, []);

const pmrRoutine = (
  createResponseBody: CreateResponseBody,
  userId: string,
  userProviders: readonly string[],
  excludedProviders: ResolvedResponse[],
  fallbackProviderModelPair: string | undefined,
  analysisTarget: string | undefined,
): Effect.Effect<ResponseResource, AIServiceError, FileSystem | VaultService> =>
  Effect.gen(function* () {
    const requestedModel = createResponseBody.model;
    if (!requestedModel) {
      // XXX: THIS SHOULD BE HANDLED BY ROUTE VALIDATION, BUT JUST IN CASE TO SATISFY TYPESCRIPT
      return yield* new AIServiceError({
        message: "`model` field is required or should not be empty",
      });
    }

    const isAutoRoute = typeof requestedModel === "string" && requestedModel.startsWith("auto");
    const useSystemPromptCache = analysisTarget === "per_system_prompt" && isAutoRoute;
    const systemPromptText = useSystemPromptCache
      ? extractSystemPromptText(
          createResponseBody.input,
          createResponseBody.instructions ?? undefined,
        )
      : null;

    // Check classification cache for per_system_prompt mode
    let cachedResult: ResolvedResponse | undefined;
    if (useSystemPromptCache && systemPromptText) {
      cachedResult = yield* Effect.promise(() => classificationCache.get(userId, systemPromptText));
      if (cachedResult) {
        yield* Effect.logInfo("Using cached classification for system prompt").pipe(
          Effect.annotateLogs({
            service: "AIService",
            operation: "pmrRoutine",
            cachedProvider: cachedResult.provider,
            cachedModel: cachedResult.model,
          }),
        );
      }
    }

    const resolvedModelResult = cachedResult
      ? Either.right(cachedResult)
      : yield* pmrService
          .resolve(createResponseBody, [...userProviders], excludedProviders, analysisTarget)
          .pipe(Effect.either);

    const isLastAttempt = Either.isLeft(resolvedModelResult);

    const resolvedModelAndProvider = isLastAttempt
      ? (parseFallbackPair(fallbackProviderModelPair) ?? HARDCODED_FALLBACK)
      : resolvedModelResult.right;

    // Cache the classification result for per_system_prompt mode
    if (useSystemPromptCache && systemPromptText && !isLastAttempt && !cachedResult) {
      yield* Effect.promise(() =>
        classificationCache.set(userId, systemPromptText, resolvedModelAndProvider),
      );
      yield* Effect.logDebug("Cached classification result for system prompt").pipe(
        Effect.annotateLogs({
          service: "AIService",
          operation: "pmrRoutine",
          cachedProvider: resolvedModelAndProvider.provider,
          cachedModel: resolvedModelAndProvider.model,
        }),
      );
    }

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
      if (!isLastAttempt) {
        return yield* pmrRoutine(
          createResponseBody,
          userId,
          userProviders,
          [...excludedProviders, resolvedModelAndProvider],
          fallbackProviderModelPair,
          analysisTarget,
        );
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

const pmrStreamRoutine = (
  createResponseBody: CreateResponseBody,
  userId: string,
  userProviders: readonly string[],
  excludedProviders: ResolvedResponse[],
): Effect.Effect<
  {
    stream: AsyncIterable<TextStreamPart<ToolSet>>;
    result: StreamResult;
    resolvedModelAndProvider: ResolvedResponse;
  },
  AIServiceError,
  FileSystem | VaultService
> =>
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
        { model: "global.anthropic.claude-haiku-4-5-20251001-v1:0", provider: "amazon-bedrock" }
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
      Effect.tryPromise<StreamResult, AIServiceError | APICallError>({
        try: (abortSignal) =>
          Promise.resolve(
            streamText({
              ...generateTextOptions,
              abortSignal,
              ...(tools ? { tools } : {}),
              ...(toolChoice ? { toolChoice } : {}),
              ...(providerOptions ? { providerOptions } : {}),
            }),
          ),
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
      if (!isLastAttempt) {
        return yield* pmrStreamRoutine(createResponseBody, userId, userProviders, [
          ...excludedProviders,
          resolvedModelAndProvider,
        ]);
      }

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
      if (!isLastAttempt) {
        return yield* pmrStreamRoutine(createResponseBody, userId, userProviders, [
          ...excludedProviders,
          resolvedModelAndProvider,
        ]);
      }

      return yield* firstChunkResult.left;
    }

    const firstChunk = firstChunkResult.right;

    if (!firstChunk.done && firstChunk.value.type === "error") {
      if (!isLastAttempt) {
        return yield* pmrStreamRoutine(createResponseBody, userId, userProviders, [
          ...excludedProviders,
          resolvedModelAndProvider,
        ]);
      }

      return yield* new AIServiceError({
        cause: firstChunk.value,
        message: "Error while reading first stream chunk",
      });
    }

    async function* reconstitutedStream() {
      if (!firstChunk.done) {
        yield firstChunk.value;
      }
      while (true) {
        const nextChunk = await streamIterator.next();
        if (nextChunk.done) {
          break;
        }
        yield nextChunk.value;
      }
    }

    return {
      stream: reconstitutedStream(),
      result: streamResult.right,
      resolvedModelAndProvider,
    };
  });
