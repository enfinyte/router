import { Effect, Data } from "effect";
import type { CreateResponseBody, ResponseResource } from "../responses/schema";

const DEFAULT_TEMPERATURE = 1.0;
const DEFAULT_TOP_P = 1.0;
const DEFAULT_PRESENCE_PENALTY = 0.0;
const DEFAULT_FREQUENCY_PENALTY = 0.0;
const DEFAULT_TOP_LOGPROBS = 0;
const DEFAULT_TRUNCATION = "auto" as const;
const DEFAULT_PARALLEL_TOOL_CALLS = false;
const DEFAULT_STORE = true;
const DEFAULT_BACKGROUND = false;
const DEFAULT_SERVICE_TIER = "default";

const MOCK_INPUT_TOKENS = 1000;
const MOCK_OUTPUT_TOKENS = 100;
const MOCK_REASONING_TOKENS = 0;
const MOCK_CACHED_TOKENS = 0;

export class AIServiceError extends Data.TaggedError("AIServiceError")<{
  cause?: unknown;
  message?: string;
}> {}

const resolveToolChoice = (
  tc: CreateResponseBody["tool_choice"],
): ResponseResource["tool_choice"] => {
  if (!tc) return "none";
  if (typeof tc === "string") return tc;
  if (tc.type === "function") return tc;
  return { ...tc, mode: tc.mode ?? "auto" };
};

const resolveTools = (tools: CreateResponseBody["tools"]): ResponseResource["tools"] =>
  tools?.map((t) => ({
    type: "FunctionTool" as const,
    name: t.name,
    description: t.description ?? null,
    parameters: t.parameters ?? null,
    strict: t.strict ?? null,
  })) ?? [];

const resolveReasoning = (
  reasoning: CreateResponseBody["reasoning"],
): ResponseResource["reasoning"] =>
  reasoning ? { effort: reasoning.effort ?? null, summary: reasoning.summary ?? null } : null;

export const makeRequest = (req: CreateResponseBody) =>
  Effect.gen(function* () {
    if (!req.model)
      return yield* Effect.fail(new AIServiceError({ message: "`model` field is required" }));

    const now = Date.now();

    return yield* Effect.succeed({
      id: crypto.randomUUID(),
      object: "response" as const,
      created_at: now,
      completed_at: now,
      status: "completed",
      incomplete_details: null,
      model: req.model,
      previous_response_id: req.previous_response_id ?? null,
      instructions: req.instructions ?? null,
      output: [],
      error: null,
      tools: resolveTools(req.tools),
      tool_choice: resolveToolChoice(req.tool_choice),
      truncation: req.truncation ?? DEFAULT_TRUNCATION,
      parallel_tool_calls: req.parallel_tool_calls ?? DEFAULT_PARALLEL_TOOL_CALLS,
      text: { format: { type: "text" as const } },
      top_p: req.top_p ?? DEFAULT_TOP_P,
      presence_penalty: req.presence_penalty ?? DEFAULT_PRESENCE_PENALTY,
      frequency_penalty: req.frequency_penalty ?? DEFAULT_FREQUENCY_PENALTY,
      top_logprobs: req.top_logprobs ?? DEFAULT_TOP_LOGPROBS,
      temperature: req.temperature ?? DEFAULT_TEMPERATURE,
      reasoning: resolveReasoning(req.reasoning),
      usage: {
        input_tokens: MOCK_INPUT_TOKENS,
        output_tokens: MOCK_OUTPUT_TOKENS,
        input_tokens_details: { cached_tokens: MOCK_CACHED_TOKENS },
        output_tokens_details: { reasoning_tokens: MOCK_REASONING_TOKENS },
        total_tokens: MOCK_INPUT_TOKENS + MOCK_OUTPUT_TOKENS,
      },
      max_output_tokens: req.max_output_tokens ?? null,
      max_tool_calls: req.max_tool_calls ?? null,
      store: req.store ?? DEFAULT_STORE,
      background: req.background ?? DEFAULT_BACKGROUND,
      service_tier: req.service_tier ?? DEFAULT_SERVICE_TIER,
      metadata: req.metadata ?? null,
      safety_identifier: req.safety_identifier ?? null,
      prompt_cache_key: req.prompt_cache_key ?? null,
    } satisfies ResponseResource);
  });
