import { Effect, Data } from "effect";
import type { CreateResponseBody, ResponseResource } from "../responses/schema";
import {
  resolveReasoning,
  resolveTools,
  resolveToolChoice,
} from "./createResponseBodyFieldsToResponseResourceFieldsResolvers";
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
import { generateText } from "ai";
import { convertCreateResponseBodyInputFieldToCallSettingsMessages } from "./createResponseBodyToAISDKGenerateTextCallSettingsAdapters";

export class AIServiceError extends Data.TaggedError("AIServiceError")<{
  cause?: unknown;
  message?: string;
}> {}

export const execute = (createResponseBody: CreateResponseBody) =>
  Effect.gen(function* () {
    const created_at = Date.now();

    const requestedModel = createResponseBody.model;
    if (!requestedModel)
      // XXX: THIS SHOULD BE HANDLED BY ROUTE VALIDATION, BUT JUST IN CASE TO SATISFY TYPESCRIPT
      return yield* Effect.fail(
        new AIServiceError({ message: "`model` field is required or should not be empty" }),
      );

    const resolvedModelAndProvider = yield* pmrService.resolve({
      ...createResponseBody,
      model: requestedModel,
    });

    const languageModel =
      yield* buildLanguageModelFromResolvedModelAndProvider(resolvedModelAndProvider);

    const messages =
      yield* convertCreateResponseBodyInputFieldToCallSettingsMessages(createResponseBody);

    // NOTE: parallel_tool_calls, max_tool_calls, prompt_cache_key, truncation, top_logProbs
    const generateTextResult = yield* Effect.tryPromise({
      try(abortSignal) {
        return generateText({
          model: languageModel,
          messages,
          abortSignal,
          ...(createResponseBody.max_output_tokens
            ? { maxOutputTokens: createResponseBody.max_output_tokens }
            : {}),
          ...(createResponseBody.top_p ? { topP: createResponseBody.top_p } : {}),
          ...(createResponseBody.temperature
            ? { temperature: createResponseBody.temperature }
            : {}),
          ...(createResponseBody.presence_penalty
            ? { presencePenalty: createResponseBody.presence_penalty }
            : {}),
          ...(createResponseBody.frequency_penalty
            ? { frequencyPenalty: createResponseBody.frequency_penalty }
            : {}),
        });
      },
      catch(error) {},
    });

    return yield* Effect.succeed({
      id: crypto.randomUUID(),
      object: "response" as const,
      created_at: created_at,
      completed_at: Date.now(),
      status: "completed",
      incomplete_details: null,
      model: createResponseBody.model,
      previous_response_id: createResponseBody.previous_response_id ?? null,
      instructions: createResponseBody.instructions ?? null,
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
      tools: resolveTools(createResponseBody.tools),
      tool_choice: resolveToolChoice(createResponseBody.tool_choice),
      truncation: createResponseBody.truncation ?? DEFAULT_TRUNCATION,
      parallel_tool_calls: createResponseBody.parallel_tool_calls ?? DEFAULT_PARALLEL_TOOL_CALLS,
      text: { format: { type: "text" as const } },
      top_p: createResponseBody.top_p ?? DEFAULT_TOP_P,
      presence_penalty: createResponseBody.presence_penalty ?? DEFAULT_PRESENCE_PENALTY,
      frequency_penalty: createResponseBody.frequency_penalty ?? DEFAULT_FREQUENCY_PENALTY,
      top_logprobs: createResponseBody.top_logprobs ?? DEFAULT_TOP_LOGPROBS,
      temperature: createResponseBody.temperature ?? DEFAULT_TEMPERATURE,
      reasoning: resolveReasoning(createResponseBody.reasoning),
      usage: {
        input_tokens: MOCK_INPUT_TOKENS,
        output_tokens: MOCK_OUTPUT_TOKENS,
        input_tokens_details: { cached_tokens: MOCK_CACHED_TOKENS },
        output_tokens_details: { reasoning_tokens: MOCK_REASONING_TOKENS },
        total_tokens: MOCK_INPUT_TOKENS + MOCK_OUTPUT_TOKENS,
      },
      max_output_tokens: createResponseBody.max_output_tokens ?? null,
      max_tool_calls: createResponseBody.max_tool_calls ?? null,
      store: createResponseBody.store ?? DEFAULT_STORE,
      background: createResponseBody.background ?? DEFAULT_BACKGROUND,
      service_tier: createResponseBody.service_tier ?? DEFAULT_SERVICE_TIER,
      metadata: createResponseBody.metadata ?? null,
      safety_identifier: createResponseBody.safety_identifier ?? null,
      prompt_cache_key: createResponseBody.prompt_cache_key ?? null,
    } satisfies ResponseResource);
  });
