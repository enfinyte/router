import type { APICallError } from "ai";
import { Effect } from "effect";
import type { CreateResponseBody, ResponseResource } from "common";
import type { ResolvedResponse } from "common";

import { buildBaseResponse } from "./response-defaults";

export const errorToResponseResource = ({
  result,
  createResponseBody,
  createdAt,
  resolvedModelAndProvider,
}: {
  result: APICallError;
  createResponseBody: CreateResponseBody;
  createdAt: number;
  resolvedModelAndProvider: ResolvedResponse;
}): Effect.Effect<ResponseResource, never, never> =>
  Effect.succeed({
    object: "response",
    id: crypto.randomUUID(),
    created_at: createdAt,
    completed_at: Date.now(),
    status: "error",
    incomplete_details: null,
    ...buildBaseResponse(createResponseBody, resolvedModelAndProvider),
    output: [],
    reasoning: null,
    error: {
      code: String(result.statusCode ?? 500),
      message: result.message,
    },
    usage: null,
  } satisfies ResponseResource);
