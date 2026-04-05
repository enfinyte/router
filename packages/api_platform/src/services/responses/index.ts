import type { CreateResponseBody, ResponseResource, StreamingEvent } from "common";

import { Effect, Data, Stream } from "effect";
import { LedgerService, ResolverService } from "@enfinyte/services";

import type { RequestParams } from "../request-context";

import * as AIService from "../ai";
import { buildTransaction } from "../ai";
import { streamToEvents } from "../ai/stream-events";
import { buildBaseResponse } from "../ai/response-defaults";
import { encodeSSEEvent, encodeSSEDone, encodeSSEToUint8Array } from "../ai/sse";
import * as DatabaseService from "../database/postgres";

export class ResponseServiceError extends Data.TaggedError("ResponseServiceError")<{
  cause?: unknown;
  message?: string;
}> {}

const buildSkeletonResponse = (
  req: CreateResponseBody,
  resolvedModelAndProvider: { provider: string; model: string },
  responseId: string,
  createdAt: number,
): ResponseResource => ({
  object: "response",
  id: responseId,
  created_at: createdAt,
  completed_at: null,
  status: "in_progress",
  incomplete_details: null,
  ...buildBaseResponse(req, resolvedModelAndProvider),
  output: [],
  error: null,
  usage: null,
});

export const create = (req: CreateResponseBody, params: RequestParams) =>
  Effect.gen(function* () {
    const responseResource = yield* AIService.execute(req, params);

    yield* persistResponseResourceInDatabase(responseResource);

    return responseResource;
  }).pipe(
    Effect.catchTags({
      AIServiceError: (err: AIService.AIServiceError) =>
        Effect.fail(new ResponseServiceError({ cause: err, message: err.message })),
      DatabaseServiceError: (err: { message?: string }) =>
        Effect.fail(new ResponseServiceError({ cause: err, message: err.message ?? "Database error" })),
    }),
  );

export const createStream = (req: CreateResponseBody, params: RequestParams) =>
  Effect.gen(function* () {
    const ledgerService = yield* LedgerService;
    const resolverService = yield* ResolverService;
    const { result, resolvedModelAndProvider, resolutionLatencyMs, llmStartedAt, ttftMs } =
      yield* AIService.executeStream(req, params);

    const responseId = crypto.randomUUID();
    const createdAt = Date.now();

    const skeletonResponse = buildSkeletonResponse(
      req,
      resolvedModelAndProvider,
      responseId,
      createdAt,
    );

    const { events, getAccumulatedState } = streamToEvents(result.fullStream, 2);

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
      (e: unknown) =>
        new ResponseServiceError({ cause: e, message: "Error during stream processing" }),
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
        catch: (e: unknown) =>
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
              buildTransaction({
                resolvedModelAndProvider,
                resolutionLatencyMs,
                userId: params.userId,
                isStreaming: true,
                response: finalResponse,
                cost,
                totalLatencyMs,
                ttftMs,
              }),
            )
            .pipe(Effect.ignore);
        }).pipe(Effect.ignore),
      ),
    );

    return sseStream;
  }).pipe(
    Effect.catchTags({
      AIServiceError: (err: AIService.AIServiceError) =>
        Effect.fail(new ResponseServiceError({ cause: err, message: err.message })),
    }),
  );

const persistResponseResourceInDatabase = (resource: ResponseResource) =>
  DatabaseService.createResponsesResource(resource);

export const getResponseResourceByIdFromDatabase = (responseId: string) =>
  DatabaseService.getResponsesResourceById(responseId);
