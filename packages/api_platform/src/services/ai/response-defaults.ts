import type { CreateResponseBody, ResponseResource } from "common";

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
import { resolveTools, resolveToolChoice, resolveTextFormat } from "./field-resolvers";

/**
 * Builds the shared base fields of a ResponseResource from a request body.
 * Used by result-to-resource, error-to-resource, and streaming skeleton to avoid
 * duplicating 20+ default field assignments.
 */
export const buildBaseResponse = (
  req: CreateResponseBody,
  resolved: { provider: string; model: string },
): Omit<ResponseResource, "id" | "object" | "created_at" | "completed_at" | "status" | "output" | "error" | "usage" | "incomplete_details"> => ({
  model: `${resolved.provider}/${resolved.model}`,
  previous_response_id: req.previous_response_id ?? null,
  instructions: req.instructions ?? null,
  text: resolveTextFormat(req.text),
  top_logprobs: req.top_logprobs ?? DEFAULT_TOP_LOGPROBS,
  reasoning: req.reasoning
    ? { effort: req.reasoning.effort ?? null, summary: req.reasoning.summary ?? null }
    : null,
  tools: resolveTools(req.tools),
  tool_choice: resolveToolChoice(req.tool_choice),
  truncation: req.truncation ?? DEFAULT_TRUNCATION,
  parallel_tool_calls: req.parallel_tool_calls ?? DEFAULT_PARALLEL_TOOL_CALLS,
  top_p: req.top_p ?? DEFAULT_TOP_P,
  presence_penalty: req.presence_penalty ?? DEFAULT_PRESENCE_PENALTY,
  frequency_penalty: req.frequency_penalty ?? DEFAULT_FREQUENCY_PENALTY,
  temperature: req.temperature ?? DEFAULT_TEMPERATURE,
  max_output_tokens: req.max_output_tokens ?? null,
  max_tool_calls: req.max_tool_calls ?? null,
  store: req.store ?? DEFAULT_STORE,
  background: req.background ?? DEFAULT_BACKGROUND,
  service_tier: req.service_tier ?? DEFAULT_SERVICE_TIER,
  metadata: req.metadata ?? null,
  safety_identifier: req.safety_identifier ?? null,
  prompt_cache_key: req.prompt_cache_key ?? null,
});
