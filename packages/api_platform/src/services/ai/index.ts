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

export class AIServiceError extends Data.TaggedError("AIServiceError")<{
  cause?: unknown;
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

type StreamResult = ReturnType<typeof streamText>;

export const execute = (
  createResponseBody: CreateResponseBody,
  userId: string,
  userProviders: readonly string[],
  fallbackProviderModelPair: string | undefined,
  analysisTarget: string | undefined,
) =>
  pmrRoutine({
    createResponseBody,
    userId,
    userProviders,
    excludedProviders: [],
    fallbackProviderModelPair,
    analysisTarget,
  });

export const executeStream = (
  createResponseBody: CreateResponseBody,
  userId: string,
  userProviders: readonly string[],
) => pmrStreamRoutine(createResponseBody, userId, userProviders, []);

const pmrRoutine = (params: {
  createResponseBody: CreateResponseBody;
  userId: string;
  userProviders: readonly string[];
  excludedProviders: ResolvedResponse[];
  fallbackProviderModelPair: string | undefined;
  analysisTarget: string | undefined;
}) =>
  Effect.gen(function* () {
    const { createResponseBody, userId, userProviders, fallbackProviderModelPair, analysisTarget } =
      params;

    if (!createResponseBody.model) {
      return yield* new AIServiceError({
        message: "`model` field is required or should not be empty",
      });
    }

    return yield* Effect.iterate(
      {
        excluded: params.excludedProviders,
        result: undefined as ResponseResource | undefined,
      },
      {
        while: (state) => state.result === undefined,
        body: (state) =>
          Effect.gen(function* () {
            const [isLastAttempt, resolvedModelAndProvider] = yield* pmrService
              .resolve({
                createResponseBody,
                userProviders: [...userProviders],
                excludedResponses: state.excluded,
                analysisTarget,
                userId,
              })
              .pipe(
                Effect.map((resolved) => [false, resolved] as const),
                Effect.orElseSucceed(
                  () =>
                    [
                      true,
                      parseFallbackPair(fallbackProviderModelPair) ?? HARDCODED_FALLBACK,
                    ] as const,
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

            return yield* Effect.tryPromise({
              try: (abortSignal) =>
                generateText({
                  model: languageModel,
                  messages,
                  abortSignal,
                  ...(createResponseBody.max_output_tokens && {
                    maxOutputTokens: createResponseBody.max_output_tokens,
                  }),
                  ...(createResponseBody.top_p && { topP: createResponseBody.top_p }),
                  ...(createResponseBody.temperature && {
                    temperature: createResponseBody.temperature,
                  }),
                  ...(createResponseBody.presence_penalty && {
                    presencePenalty: createResponseBody.presence_penalty,
                  }),
                  ...(createResponseBody.frequency_penalty && {
                    frequencyPenalty: createResponseBody.frequency_penalty,
                  }),
                  ...(tools && { tools }),
                  ...(toolChoice && { toolChoice }),
                  ...(outputFormat && { output: outputFormat }),
                  ...(providerOptions && { providerOptions }),
                }),
              catch: (error) =>
                error instanceof APICallError
                  ? error
                  : new AIServiceError({
                      cause: error,
                      message: "Error while calling generateText",
                    }),
            }).pipe(
              Effect.flatMap((result) =>
                convertAISdkGenerateTextResultToResponseResource({
                  result,
                  createResponseBody,
                  createdAt: Date.now(),
                  resolvedModelAndProvider,
                }).pipe(
                  Effect.map((responseResource) => ({
                    excluded: state.excluded,
                    result: responseResource,
                  })),
                ),
              ),
              Effect.catchAll((error) => {
                if (!isLastAttempt) {
                  return Effect.succeed({
                    excluded: [...state.excluded, resolvedModelAndProvider],
                    result: undefined as ResponseResource | undefined,
                  });
                }

                if (error instanceof AIServiceError) return Effect.fail(error);

                return convertAPICallErrorToResponseResource({
                  result: error,
                  createResponseBody,
                  createdAt: Date.now(),
                  resolvedModelAndProvider,
                }).pipe(
                  Effect.map((responseResource) => ({
                    excluded: state.excluded,
                    result: responseResource,
                  })),
                );
              }),
            );
          }),
      },
    ).pipe(Effect.map((state) => state.result as ResponseResource));
  });

const pmrStreamRoutine = (
  createResponseBody: CreateResponseBody,
  userId: string,
  userProviders: readonly string[],
  excludedProviders: ResolvedResponse[],
) =>
  Effect.gen(function* () {
    if (!createResponseBody.model) {
      return yield* new AIServiceError({
        message: "`model` field is required or should not be empty",
      });
    }

    type StreamSuccess = {
      stream: AsyncIterable<TextStreamPart<ToolSet>>;
      result: StreamResult;
      resolvedModelAndProvider: ResolvedResponse;
    };

    return yield* Effect.iterate(
      { excluded: excludedProviders, result: undefined as StreamSuccess | undefined },
      {
        while: (state) => state.result === undefined,
        body: (state) =>
          Effect.gen(function* () {
            const resolvedModelResult = yield* pmrService
              .resolve({
                createResponseBody,
                userProviders: [...userProviders],
                excludedResponses: state.excluded,
                userId,
              })
              .pipe(Effect.either);

            const isLastAttempt = Either.isLeft(resolvedModelResult);
            const resolvedModelAndProvider = isLastAttempt
              ? {
                  model: "global.anthropic.claude-haiku-4-5-20251001-v1:0",
                  provider: "amazon-bedrock",
                }
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

            const streamResult = yield* Effect.either(
              Effect.tryPromise<StreamResult, AIServiceError | APICallError>({
                try: (abortSignal) =>
                  Promise.resolve(
                    streamText({
                      model: languageModel,
                      messages,
                      ...(createResponseBody.max_output_tokens && {
                        maxOutputTokens: createResponseBody.max_output_tokens,
                      }),
                      ...(createResponseBody.top_p && { topP: createResponseBody.top_p }),
                      ...(createResponseBody.temperature && {
                        temperature: createResponseBody.temperature,
                      }),
                      ...(createResponseBody.presence_penalty && {
                        presencePenalty: createResponseBody.presence_penalty,
                      }),
                      ...(createResponseBody.frequency_penalty && {
                        frequencyPenalty: createResponseBody.frequency_penalty,
                      }),
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
                return {
                  excluded: [...state.excluded, resolvedModelAndProvider],
                  result: undefined as StreamSuccess | undefined,
                };
              }

              const errorValue = streamResult.left;
              if (errorValue instanceof AIServiceError) return yield* Effect.fail(errorValue);
              return yield* Effect.fail(
                new AIServiceError({
                  cause: errorValue,
                  message: "Error while calling streamText",
                }),
              );
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
                return {
                  excluded: [...state.excluded, resolvedModelAndProvider],
                  result: undefined as StreamSuccess | undefined,
                };
              }

              return yield* Effect.fail(firstChunkResult.left);
            }

            const firstChunk = firstChunkResult.right;
            if (!firstChunk.done && firstChunk.value.type === "error") {
              if (!isLastAttempt) {
                return {
                  excluded: [...state.excluded, resolvedModelAndProvider],
                  result: undefined as StreamSuccess | undefined,
                };
              }

              return yield* Effect.fail(
                new AIServiceError({
                  cause: firstChunk.value,
                  message: "Error while reading first stream chunk",
                }),
              );
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
              excluded: state.excluded,
              result: {
                stream: reconstitutedStream(),
                result: streamResult.right,
                resolvedModelAndProvider,
              },
            };
          }),
      },
    ).pipe(Effect.map((state) => state.result as StreamSuccess));
  });
