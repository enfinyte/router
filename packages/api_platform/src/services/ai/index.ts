import type { CreateResponseBody, ResolvedResponse, ResponseResource, Providers } from "common";
import type { Transaction } from "ledger";

import { AISDKError, type TextStreamPart, type ToolSet } from "ai";
import { APICallError, generateText, streamText } from "ai";
import { Effect, Data, Either } from "effect";
import { LedgerService } from "ledger";
import { ResolverService } from "resolver";

import type { RequestParams } from "../request-context";

import * as CredentialsService from "../credentials";
import * as pmrService from "../pmr";
import { buildLanguageModel } from "./model-factory";
import { resultToResponseResource } from "./result-to-resource";
import { errorToResponseResource } from "./error-to-resource";
import {
  inputToMessages,
  toolsToCallSettings,
  toolChoiceToCallSettings,
  textFormatToOutput,
  reasoningToProviderOptions,
} from "./adapters";

export class AIServiceError extends Data.TaggedError("AIServiceError")<{
  cause?: unknown;
  message?: string;
}> {}

type StreamResult = ReturnType<typeof streamText>;

const prepareCallOptions = (
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

    const languageModel = yield* buildLanguageModel(resolvedModelAndProvider, credentials);

    const messages = yield* inputToMessages(createResponseBody);

    const tools = toolsToCallSettings(
      createResponseBody.tools,
      createResponseBody.tool_choice,
    );

    const toolChoice = toolChoiceToCallSettings(createResponseBody.tool_choice);

    const outputFormat = textFormatToOutput(createResponseBody.text);

    const hasStructuredOutput = createResponseBody.text?.format?.type === "json_schema";

    const providerOptions = reasoningToProviderOptions(
      createResponseBody.reasoning,
      resolvedModelAndProvider.model,
      hasStructuredOutput,
    );

    const baseOptions = {
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

    return { baseOptions, tools, toolChoice, outputFormat, providerOptions };
  });

const resolveProviders = (
  createResponseBody: CreateResponseBody,
  params: RequestParams,
) =>
  Effect.gen(function* () {
    const resolvedResult = yield* Effect.either(
      pmrService.resolve(
        createResponseBody,
        params.userId,
        [...params.userProviders],
        params.analysisTarget,
      ),
    );

    if (Either.isLeft(resolvedResult)) {
      if (params.fallbackProviderModelPair) {
        return {
          pairs: [
            {
              ...params.fallbackProviderModelPair,
              category: null as string | null,
            },
          ] as ResolvedResponse[],
          resolutionLatencyMs: 0,
        };
      }
      return yield* new AIServiceError({
        message: "Model resolution failed and no fallback provider is configured",
      });
    }

    return resolvedResult.right;
  });

const tryProviders = <T, E, R>(
  providers: readonly ResolvedResponse[],
  fn: (provider: ResolvedResponse) => Effect.Effect<T, E, R>,
  fallback: ResolvedResponse | null,
): Effect.Effect<T, AIServiceError | E, R> =>
  Effect.gen(function* () {
    for (const provider of providers) {
      const result = yield* Effect.either(fn(provider));
      if (Either.isRight(result)) return result.right;
    }

    if (fallback) {
      return yield* fn(fallback);
    }

    return yield* new AIServiceError({
      message: "All providers failed and no fallback is available",
    });
  });

export const execute = (body: CreateResponseBody, params: RequestParams) =>
  Effect.gen(function* () {
    const ledgerService = yield* LedgerService;
    const resolverService = yield* ResolverService;

    if (!body.model) {
      return yield* new AIServiceError({
        message: "`model` field is required or should not be empty",
      });
    }

    const { pairs, resolutionLatencyMs } = yield* resolveProviders(body, params);

    const fallback = params.fallbackProviderModelPair
      ? { ...params.fallbackProviderModelPair, category: null as string | null }
      : null;

    return yield* tryProviders(
      pairs,
      (resolvedModelAndProvider) =>
        Effect.gen(function* () {
          const llmStartedAt = Date.now();
          const response = yield* callLanguageModel(params.userId, body, resolvedModelAndProvider);
          const totalLatencyMs = Date.now() - llmStartedAt;

          const cost = yield* resolverService
            .getCostForModel(
              `${resolvedModelAndProvider.provider}/${resolvedModelAndProvider.model}`,
            )
            .pipe(Effect.catchAll(() => Effect.succeed(null)));

          yield* ledgerService
            .insertTransaction(
              buildTransaction({
                resolvedModelAndProvider,
                resolutionLatencyMs,
                userId: params.userId,
                isStreaming: false,
                response,
                cost,
                totalLatencyMs,
                ttftMs: null,
              }),
            )
            .pipe(Effect.ignore);

          if (response.error !== null) {
            return yield* new AIServiceError({
              message: response.error.message,
            });
          }

          return response;
        }),
      fallback,
    );
  });

export const executeStream = (body: CreateResponseBody, params: RequestParams) =>
  Effect.gen(function* () {
    if (!body.model) {
      return yield* new AIServiceError({
        message: "`model` field is required or should not be empty",
      });
    }

    const { pairs, resolutionLatencyMs } = yield* resolveProviders(body, params);

    const fallback = params.fallbackProviderModelPair
      ? { ...params.fallbackProviderModelPair, category: null as string | null }
      : null;

    return yield* tryProviders(
      pairs,
      (resolvedModelAndProvider) =>
        Effect.gen(function* () {
          const llmStartedAt = Date.now();
          const callResult = yield* callLanguageModelStreaming(
            params.userId,
            body,
            resolvedModelAndProvider,
          );

          const probedFullStream = yield* probeStream(callResult.result);

          Object.defineProperty(callResult.result, "fullStream", { value: probedFullStream });

          const ttftMs = Date.now() - llmStartedAt;
          return { ...callResult, resolutionLatencyMs, llmStartedAt, ttftMs };
        }),
      fallback
        ? {
            ...fallback,
            category: null as string | null,
          }
        : null,
    );
  });

const callLanguageModel = (
  userId: string,
  createResponseBody: CreateResponseBody,
  resolvedModelAndProvider: ResolvedResponse,
) =>
  Effect.gen(function* () {
    const { baseOptions, tools, toolChoice, outputFormat, providerOptions } =
      yield* prepareCallOptions(userId, createResponseBody, resolvedModelAndProvider);

    const result = yield* Effect.either(
      Effect.tryPromise({
        try: (abortSignal) =>
          generateText({
            ...baseOptions,
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

      return yield* errorToResponseResource({
        result: errorValue,
        createResponseBody,
        createdAt: Date.now(),
        resolvedModelAndProvider,
      });
    }

    return yield* resultToResponseResource({
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
    const { baseOptions, tools, toolChoice, providerOptions } =
      yield* prepareCallOptions(userId, createResponseBody, resolvedModelAndProvider);

    const stream = yield* Effect.try({
      try: () =>
        streamText({
          ...baseOptions,
          ...(tools ? { tools } : {}),
          ...(toolChoice ? { toolChoice } : {}),
          ...(providerOptions ? { providerOptions } : {}),
        }),
      catch(error) {
        if (error instanceof AISDKError) return error;
        return new AIServiceError({
          cause: error,
          message: "Error while calling streamText",
        });
      },
    });

    return {
      result: stream,
      resolvedModelAndProvider,
    };
  });

const SDK_LIFECYCLE_EVENTS = new Set(["start", "finish"]);

const isProviderContent = (part: TextStreamPart<ToolSet>) =>
  !SDK_LIFECYCLE_EVENTS.has(part.type) && part.type !== "error";

const rejectOnResponseError = (streamResult: StreamResult) =>
  new Promise<never>((_, reject) => {
    streamResult.response.then(() => {}, reject);
  });

const probeStream = (streamResult: StreamResult) =>
  Effect.tryPromise({
    try: async () => {
      const responseErrorSignal = rejectOnResponseError(streamResult);
      const iterator = streamResult.fullStream[Symbol.asyncIterator]();
      const buffered: TextStreamPart<ToolSet>[] = [];

      while (true) {
        const chunk = await Promise.race([iterator.next(), responseErrorSignal]);

        if (chunk.done) {
          throw new Error("Stream completed without producing any content");
        }

        buffered.push(chunk.value);

        if (chunk.value.type === "error") {
          throw (
            (chunk.value as { error?: unknown }).error ??
            new Error("Stream produced an error event")
          );
        }

        if (isProviderContent(chunk.value)) {
          break;
        }
      }

      return (async function* () {
        yield* buffered;
        for await (const part of { [Symbol.asyncIterator]: () => iterator }) {
          yield part;
        }
      })();
    },
    catch: (error) => new AIServiceError({ cause: error, message: "Stream failed on first chunk" }),
  });

export const buildTransaction = (opts: {
  resolvedModelAndProvider: ResolvedResponse;
  resolutionLatencyMs: number;
  userId: string;
  isStreaming: boolean;
  response: ResponseResource | null;
  cost: { input: number; output: number } | null;
  totalLatencyMs: number | null;
  ttftMs: number | null;
}): Transaction => {
  const {
    resolvedModelAndProvider,
    resolutionLatencyMs,
    userId,
    isStreaming,
    response,
    cost,
    totalLatencyMs,
    ttftMs,
  } = opts;

  const usage = response?.usage ?? null;
  const inputTokens = usage?.input_tokens ?? null;
  const outputTokens = usage?.output_tokens ?? null;
  const reasoningTokens = usage?.output_tokens_details?.reasoning_tokens ?? null;

  const httpStatusCode = response?.error
    ? parseInt(response.error.code, 10) || null
    : response ? 200 : null;
  const errorType = response?.error?.message ?? null;

  return {
    timestamp: new Date(),
    request_id: crypto.randomUUID(),
    provider: resolvedModelAndProvider.provider,
    model: resolvedModelAndProvider.model,
    category: resolvedModelAndProvider.category,
    resolution_latency_ms: resolutionLatencyMs,
    ttft_ms: ttftMs,
    total_latency_ms: totalLatencyMs,
    input_tokens: inputTokens,
    reasoning_tokens: reasoningTokens,
    output_tokens: outputTokens,
    input_cost_usd: inputTokens != null && cost ? inputTokens * cost.input : null,
    reasoning_cost_usd: reasoningTokens != null && cost ? reasoningTokens * cost.input : null,
    output_cost_usd: outputTokens != null && cost ? outputTokens * cost.output : null,
    http_status_code: httpStatusCode,
    error_type: errorType,
    is_streaming: isStreaming,
    user_id: userId,
  };
};
