import { bedrock } from "@ai-sdk/amazon-bedrock";
import { Output, generateText } from "ai";
import { Effect } from "effect";
import { z } from "zod";

import { resolverLog } from "../log";
import { CATEGORIES, DataFetchError, ORDERS } from "../types";
import { SYSTEM_PROMPT_CAT, SYSTEM_PROMPT_POL } from "./prompts";

export const RETRY_POLICY = { times: 5 };
const LLM_MODEL = "moonshotai.kimi-k2.5";

const classifyWithLLM = (
  prompt: string,
  systemPrompt: string,
  schema: z.ZodType,
  fieldName: string,
  operationName: string,
) => {
  const l = resolverLog(operationName);

  return Effect.tryPromise({
    try: () =>
      generateText({
        model: bedrock(LLM_MODEL),
        system: systemPrompt,
        output: Output.object({ schema }),
        messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
      }).then((res) => {
        const value = (res.output as Record<string, string> | null)?.[fieldName];
        if (value === undefined || value === null) {
          throw new Error(`LLM output missing field "${fieldName}"`);
        }
        return value;
      }),
    catch: (error) =>
      new DataFetchError({
        reason: "APICallFailed",
        message: `Failed to classify ${operationName}`,
        cause: error,
      }),
  }).pipe(
    Effect.tapError((err) =>
      l.error(`LLM ${operationName} classification failed`, {
        llmModel: LLM_MODEL,
        cause: err.cause instanceof Error ? err.cause.message : String(err.cause),
      }),
    ),
    Effect.tap((result) =>
      l.debug(`LLM ${operationName} classified`, { llmModel: LLM_MODEL, result }),
    ),
  );
};

export const classifyCategory = (prompt: string) =>
  classifyWithLLM(
    prompt,
    SYSTEM_PROMPT_CAT,
    z.object({ category: z.enum(CATEGORIES) }),
    "category",
    "classifyCategory",
  );

export const classifyPolicy = (prompt: string) =>
  classifyWithLLM(
    prompt,
    SYSTEM_PROMPT_POL,
    z.object({ policy: z.enum(ORDERS) }),
    "policy",
    "classifyPolicy",
  );
