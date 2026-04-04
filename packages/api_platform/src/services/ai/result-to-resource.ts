import { Effect } from "effect";
import type { CreateResponseBody, ResponseResource } from "common";
import type { generateText } from "ai";
import type { ResolvedResponse } from "common";

import { messagesToOutput } from "./messages-to-output";
import { buildBaseResponse } from "./response-defaults";

export const resultToResponseResource = ({
  result,
  createdAt,
  resolvedModelAndProvider,
  createResponseBody,
}: {
  result: Awaited<ReturnType<typeof generateText>>;
  createdAt: number;
  resolvedModelAndProvider: ResolvedResponse;
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
      ...buildBaseResponse(createResponseBody, resolvedModelAndProvider),
      output: yield* messagesToOutput(result),
      error: null,
      usage: {
        input_tokens: result.totalUsage.inputTokens ?? 0,
        output_tokens: result.totalUsage.outputTokens ?? 0,
        input_tokens_details: {
          cached_tokens: result.totalUsage.inputTokenDetails?.cacheWriteTokens ?? 0,
        },
        output_tokens_details: {
          reasoning_tokens: result.totalUsage.outputTokenDetails?.reasoningTokens ?? 0,
        },
        total_tokens: result.totalUsage.totalTokens ?? 0,
      },
    } satisfies ResponseResource;
  });
