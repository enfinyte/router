import type { APICallError } from "ai";
import { Effect } from "effect";
import type { CreateResponseBody, ResponseResource } from "../responses/schema";
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

export const convertAPICallErrorToResponseResource = ({
  result,
  createResponseBody,
  createdAt,
  resolvedModelAndProvider,
}: {
  result: APICallError;
  createResponseBody: CreateResponseBody;
  createdAt: number;
  resolvedModelAndProvider: `${string}:${string}`;
}): Effect.Effect<ResponseResource, never, never> =>
  Effect.succeed({
    id: crypto.randomUUID(),
    created_at: createdAt,
    model: resolvedModelAndProvider,
    completed_at: Date.now(),
    error: {
      code: String(result.statusCode ?? 500),
      message: result.message,
    },
    object: "response",
    background: createResponseBody.background ?? DEFAULT_BACKGROUND,
    status: "error",
    incomplete_details: null,
    previous_response_id: createResponseBody.previous_response_id ?? null,
    instructions: createResponseBody.instructions ?? null,
    output: [],
    tools: resolveTools(createResponseBody.tools),
    tool_choice: resolveToolChoice(createResponseBody.tool_choice),
    truncation: createResponseBody.truncation ?? DEFAULT_TRUNCATION,
    text: { format: { type: "text" as const } },
    top_p: createResponseBody.top_p ?? DEFAULT_TOP_P,
    presence_penalty: createResponseBody.presence_penalty ?? DEFAULT_PRESENCE_PENALTY,
    frequency_penalty: createResponseBody.frequency_penalty ?? DEFAULT_FREQUENCY_PENALTY,
    top_logprobs: createResponseBody.top_logprobs ?? DEFAULT_TOP_LOGPROBS,
    temperature: createResponseBody.temperature ?? DEFAULT_TEMPERATURE,
    reasoning: null,
    usage: null,
    max_output_tokens: createResponseBody.max_output_tokens ?? null,
    max_tool_calls: createResponseBody.max_tool_calls ?? null,
    store: createResponseBody.store ?? DEFAULT_STORE,
    service_tier: createResponseBody.service_tier ?? DEFAULT_SERVICE_TIER,
    metadata: createResponseBody.metadata ?? null,
    safety_identifier: createResponseBody.safety_identifier ?? null,
    prompt_cache_key: createResponseBody.prompt_cache_key ?? null,
    parallel_tool_calls: createResponseBody.parallel_tool_calls ?? DEFAULT_PARALLEL_TOOL_CALLS,
  } satisfies ResponseResource);
