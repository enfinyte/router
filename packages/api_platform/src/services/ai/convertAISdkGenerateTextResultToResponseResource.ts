import { Effect } from "effect";
import type { CreateResponseBody, ResponseResource } from "../responses/schema";
import type { generateText } from "ai";
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
} from "./consts";
import {
  resolveTools,
  resolveToolChoice,
} from "./createResponseBodyFieldsToResponseResourceFieldsResolvers";
import { convertAISdkGenerateTextMessagesToResponseResourceOutput } from "./convertAISdkGenerateTextMessagesToResponseResourceOutput";
import type { ResolvedModelAndProvider } from "../pmr";

export const convertAISdkGenerateTextResultToResponseResource = ({
  result,
  createdAt,
  resolvedModelAndProvider,
  createResponseBody,
}: {
  result: Awaited<ReturnType<typeof generateText>>;
  createdAt: number;
  resolvedModelAndProvider: ResolvedModelAndProvider;
  createResponseBody: CreateResponseBody;
}) =>
  Effect.gen(function* () {
    return {
      object: "response",
      id: crypto.randomUUID(),
      created_at: createdAt,
      completed_at: Date.now(),
      status: "completed",
      incomplete_details: null,
      model: resolvedModelAndProvider,
      previous_response_id: createResponseBody.previous_response_id ?? null,
      instructions: createResponseBody.instructions ?? null,
      output: yield* convertAISdkGenerateTextMessagesToResponseResourceOutput(result),
      text: {
        format: {
          type: "text" as const,
        },
      },
      top_logprobs: createResponseBody.top_logprobs ?? DEFAULT_TOP_LOGPROBS,
      reasoning: createResponseBody.reasoning
        ? {
            effort: createResponseBody.reasoning.effort ?? null,
            summary: createResponseBody.reasoning.summary ?? null,
          }
        : null,
      error: null,
      tools: resolveTools(createResponseBody.tools),
      tool_choice: resolveToolChoice(createResponseBody.tool_choice),
      truncation: createResponseBody.truncation ?? DEFAULT_TRUNCATION,
      parallel_tool_calls: createResponseBody.parallel_tool_calls ?? DEFAULT_PARALLEL_TOOL_CALLS,
      top_p: createResponseBody.top_p ?? DEFAULT_TOP_P,
      presence_penalty: createResponseBody.presence_penalty ?? DEFAULT_PRESENCE_PENALTY,
      frequency_penalty: createResponseBody.frequency_penalty ?? DEFAULT_FREQUENCY_PENALTY,
      temperature: createResponseBody.temperature ?? DEFAULT_TEMPERATURE,
      usage: {
        input_tokens: result.totalUsage.inputTokens ?? 0,
        output_tokens: result.totalUsage.outputTokens ?? 0,
        input_tokens_details: {
          cached_tokens: result.totalUsage.inputTokenDetails.cacheWriteTokens ?? 0,
        },
        output_tokens_details: {
          reasoning_tokens: result.totalUsage.outputTokenDetails.reasoningTokens ?? 0,
        },
        total_tokens: result.totalUsage.totalTokens ?? 0,
      },
      max_output_tokens: createResponseBody.max_output_tokens ?? null,
      max_tool_calls: createResponseBody.max_tool_calls ?? null,
      store: createResponseBody.store ?? DEFAULT_STORE,
      background: createResponseBody.background ?? DEFAULT_BACKGROUND,
      service_tier: createResponseBody.service_tier ?? DEFAULT_SERVICE_TIER,
      metadata: createResponseBody.metadata ?? null,
      safety_identifier: createResponseBody.safety_identifier ?? null,
      prompt_cache_key: createResponseBody.prompt_cache_key ?? null,
    } satisfies ResponseResource;
  });
