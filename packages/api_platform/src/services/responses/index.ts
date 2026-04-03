import type { CreateResponseBody, ResponseResource, StreamingEvent } from "common";
import type { Transaction } from "ledger";
import type { ProviderModelPair } from "resolver/src/types";

import { Effect, Data, Stream } from "effect";
import { LedgerService } from "ledger";
import { ResolverService } from "resolver";

import * as AIService from "../ai";
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
} from "../ai/consts";
import { convertAISdkStreamTextToStreamingEvents } from "../ai/convertAISdkStreamTextToStreamingEvents";
import {
  resolveTools,
  resolveToolChoice,
  resolveTextFormat,
} from "../ai/createResponseBodyFieldsToResponseResourceFieldsResolvers";
import { encodeSSEEvent, encodeSSEDone, encodeSSEToUint8Array } from "../ai/sse";
import * as DatabaseService from "../database/postgres";

export class ResponseServiceError extends Data.TaggedError("ResponseServiceError")<{
  cause?: unknown;
  message?: string;
}> {}

export const create = (
  req: CreateResponseBody,
  userId: string,
  userProviders: readonly string[],
  fallbackProviderModelPair: ProviderModelPair,
  analysisTarget: string,
) =>
  Effect.gen(function* () {
    const responseResource = yield* AIService.execute(
      req,
      userId,
      userProviders,
      fallbackProviderModelPair,
      analysisTarget,
    );

    yield* persistResponseResourceInDatabase(responseResource);

    return responseResource;
  }).pipe(
    Effect.catchTags({
      AIServiceError: (err) =>
        Effect.fail(new ResponseServiceError({ cause: err, message: err.message })),
      DatabaseServiceError: (err) =>
        Effect.fail(new ResponseServiceError({ cause: err, message: err.message })),
    }),
  );

export const createStream = (
  req: CreateResponseBody,
  userId: string,
  userProviders: readonly string[],
  fallbackProviderModelPair: ProviderModelPair,
  analysisTarget: string,
) =>
  Effect.gen(function* () {
    const ledgerService = yield* LedgerService;
    const resolverService = yield* ResolverService;
    const { result, resolvedModelAndProvider, resolutionLatencyMs, llmStartedAt, ttftMs } =
      yield* AIService.executeStream(
        req,
        userId,
        userProviders,
        fallbackProviderModelPair,
        analysisTarget,
      );

    const responseId = crypto.randomUUID();
    const createdAt = Date.now();

    const skeletonResponse: ResponseResource = {
      object: "response",
      id: responseId,
      created_at: createdAt,
      completed_at: null,
      status: "in_progress",
      incomplete_details: null,
      model: `${resolvedModelAndProvider.provider}/${resolvedModelAndProvider.model}`,
      previous_response_id: req.previous_response_id ?? null,
      instructions: req.instructions ?? null,
      output: [],
      text: resolveTextFormat(req.text),
      top_logprobs: req.top_logprobs ?? DEFAULT_TOP_LOGPROBS,
      reasoning: req.reasoning
        ? { effort: req.reasoning.effort ?? null, summary: req.reasoning.summary ?? null }
        : null,
      error: null,
      tools: resolveTools(req.tools),
      tool_choice: resolveToolChoice(req.tool_choice),
      truncation: req.truncation ?? DEFAULT_TRUNCATION,
      parallel_tool_calls: req.parallel_tool_calls ?? DEFAULT_PARALLEL_TOOL_CALLS,
      top_p: req.top_p ?? DEFAULT_TOP_P,
      presence_penalty: req.presence_penalty ?? DEFAULT_PRESENCE_PENALTY,
      frequency_penalty: req.frequency_penalty ?? DEFAULT_FREQUENCY_PENALTY,
      temperature: req.temperature ?? DEFAULT_TEMPERATURE,
      usage: null,
      max_output_tokens: req.max_output_tokens ?? null,
      max_tool_calls: req.max_tool_calls ?? null,
      store: req.store ?? DEFAULT_STORE,
      background: req.background ?? DEFAULT_BACKGROUND,
      service_tier: req.service_tier ?? DEFAULT_SERVICE_TIER,
      metadata: req.metadata ?? null,
      safety_identifier: req.safety_identifier ?? null,
      prompt_cache_key: req.prompt_cache_key ?? null,
    };

    const { events, getAccumulatedState } = convertAISdkStreamTextToStreamingEvents(
      result.fullStream,
      2,
    );

    let finalResponse: ResponseResource = skeletonResponse;

    const lifecycleStream = Stream.make(
      encodeSSEToUint8Array(
        encodeSSEEvent("response.created", {
          type: "response.created",
          sequence_number: 0,
          response: skeletonResponse,
        } satisfies StreamingEvent),
      ),
      encodeSSEToUint8Array(
        encodeSSEEvent("response.in_progress", {
          type: "response.in_progress",
          sequence_number: 1,
          response: skeletonResponse,
        } satisfies StreamingEvent),
      ),
    );

    const deltaStream = Stream.fromAsyncIterable(
      events as AsyncIterable<readonly StreamingEvent[]>,
      (e) => new ResponseServiceError({ cause: e, message: "Error during stream processing" }),
    ).pipe(
      Stream.flatMap((eventArray) => Stream.fromIterable(eventArray)),
      Stream.map((event) => encodeSSEToUint8Array(encodeSSEEvent(event.type, event))),
    );

    const completionStream = Stream.fromEffect(
      Effect.tryPromise({
        try: async () => {
          const totalUsage = await Promise.resolve(result.totalUsage).catch(() => null);
          const state = getAccumulatedState();

          finalResponse = {
            ...skeletonResponse,
            status: "completed",
            completed_at: Date.now(),
            output: state.outputItems,
            usage: {
              input_tokens: totalUsage?.inputTokens ?? 0,
              output_tokens: totalUsage?.outputTokens ?? 0,
              input_tokens_details: {
                cached_tokens: totalUsage?.inputTokenDetails?.cacheWriteTokens ?? 0,
              },
              output_tokens_details: {
                reasoning_tokens: totalUsage?.outputTokenDetails?.reasoningTokens ?? 0,
              },
              total_tokens: totalUsage?.totalTokens ?? 0,
            },
          };

          return [
            encodeSSEToUint8Array(
              encodeSSEEvent("response.completed", {
                type: "response.completed",
                sequence_number: state.sequenceNumber,
                response: finalResponse,
              } satisfies StreamingEvent),
            ),
            encodeSSEToUint8Array(encodeSSEDone()),
          ];
        },
        catch: (e) =>
          new ResponseServiceError({ cause: e, message: "Error building completion events" }),
      }),
    ).pipe(Stream.flatMap((arr) => Stream.fromIterable(arr)));

    const sseStream = lifecycleStream.pipe(
      Stream.concat(deltaStream),
      Stream.concat(completionStream),
      Stream.catchAll((err: ResponseServiceError) => {
        const state = getAccumulatedState();

        finalResponse = {
          ...skeletonResponse,
          status: "failed",
          error: {
            code: "server_error",
            message: err.message ?? "An error occurred during streaming",
          },
        };

        return Stream.make(
          encodeSSEToUint8Array(
            encodeSSEEvent("response.failed", {
              type: "response.failed",
              sequence_number: state.sequenceNumber,
              response: finalResponse,
            } satisfies StreamingEvent),
          ),
          encodeSSEToUint8Array(encodeSSEDone()),
        );
      }),
      Stream.ensuring(
        Effect.gen(function* () {
          if (req.store !== false) {
            yield* persistResponseResourceInDatabase(finalResponse);
          }
          const cost = yield* resolverService
            .getCostForModel(
              `${resolvedModelAndProvider.provider}/${resolvedModelAndProvider.model}`,
            )
            .pipe(Effect.catchAll(() => Effect.succeed(null)));
          const totalLatencyMs = Date.now() - llmStartedAt;
          yield* ledgerService
            .insertTransaction(
              buildStreamTransaction(
                resolvedModelAndProvider,
                resolutionLatencyMs,
                userId,
                finalResponse,
                cost,
                totalLatencyMs,
                ttftMs,
              ),
            )
            .pipe(Effect.ignore);
        }).pipe(Effect.ignore),
      ),
    );

    return sseStream;
  }).pipe(
    Effect.catchTags({
      AIServiceError: (err) =>
        Effect.fail(new ResponseServiceError({ cause: err, message: err.message })),
    }),
  );

const persistResponseResourceInDatabase = (resource: ResponseResource) =>
  DatabaseService.createResponsesResource(resource);

const buildStreamTransaction = (
  resolvedModelAndProvider: { provider: string; model: string; category: string | null },
  resolutionLatencyMs: number,
  userId: string,
  response: ResponseResource,
  cost: { input: number; output: number } | null,
  totalLatencyMs: number,
  ttftMs: number,
): Transaction => {
  const usage = response.usage;
  const inputTokens = usage?.input_tokens ?? null;
  const outputTokens = usage?.output_tokens ?? null;
  const reasoningTokens = usage?.output_tokens_details?.reasoning_tokens ?? null;

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
    http_status_code: response.error
      ? parseInt(response.error.code, 10) || null
      : 200,
    error_type: response.error?.message ?? null,
    is_streaming: true,
    user_id: userId,
  };
};

export const getResponseResourceByIdFromDatabase = (responseId: string) =>
  DatabaseService.getResponsesResourceById(responseId);
