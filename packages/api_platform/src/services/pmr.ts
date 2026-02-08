import { Effect } from "effect";
import type { CreateResponseBody } from "./responses/schema";

export type ResolvedModelAndProvider = `${string}/${string}`;

export const resolve = (
  createResponseBody: Omit<CreateResponseBody, "model"> &
    Required<Pick<CreateResponseBody, "model">>,
) =>
  Effect.succeed(
    "amazon-bedrock/global.anthropic.claude-haiku-4-5-20251001-v1:0" satisfies ResolvedModelAndProvider as ResolvedModelAndProvider,
  );
