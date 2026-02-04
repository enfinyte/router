import { Effect, Data } from "effect";
import type { CreateResponseBody, ResponseResource } from "../responses/schema";
import {
  resolveReasoning,
  resolveTools,
  resolveToolChoice,
} from "./createRequestBodyFieldsToResponseResourceFieldsResolvers";
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
  MOCK_CACHED_TOKENS,
  MOCK_INPUT_TOKENS,
  MOCK_OUTPUT_TOKENS,
  MOCK_REASONING_TOKENS,
} from "./consts";
import * as pmrService from "../pmr";
import { buildLanguageModelFromResolvedModelAndProvider } from "./buildLanguageModelFromResolvedModelAndProvider";

export class AIServiceError extends Data.TaggedError("AIServiceError")<{
  cause?: unknown;
  message?: string;
}> {}

export const execute = (req: CreateResponseBody) =>
  Effect.gen(function* () {
    const created_at = Date.now();

    const requestedModel = req.model;
    if (!requestedModel)
      // XXX: THIS SHOULD BE HANDLED BY ROUTE VALIDATION, BUT JUST IN CASE TO SATISFY TYPESCRIPT
      return yield* Effect.fail(
        new AIServiceError({ message: "`model` field is required or should not be empty" }),
      );

    const resolvedModelAndProvider = yield* pmrService.resolve({ ...req, model: requestedModel });

    const languageModel =
      yield* buildLanguageModelFromResolvedModelAndProvider(resolvedModelAndProvider);

    if (req.text && req.text.format?.type === "json_schema") {
      // DO GENERATE OBJECT BASED ON SCHEMA
    } else {
      // DO GENERATE NORMAL TEXT RESPONSE
    }

    return yield* Effect.succeed({
      id: crypto.randomUUID(),
      object: "response" as const,
      created_at: created_at,
      completed_at: Date.now(),
      status: "completed",
      incomplete_details: null,
      model: req.model,
      previous_response_id: req.previous_response_id ?? null,
      instructions: req.instructions ?? null,
      output: [
        {
          id: crypto.randomUUID(),
          type: "message",
          role: "assistant",
          status: "completed",
          content: [
            {
              type: "output_text",
              text: "ahoy there mate",
              annotations: [],
              logprobs: [],
            },
          ],
        },
      ],
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
