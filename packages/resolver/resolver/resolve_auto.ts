import { Effect } from "effect";
import { DataFetchError, INTENT_POLICIES, IntentPair, INTENTS } from "../types";
import { Output, generateText } from "ai";
import { bedrock } from "@ai-sdk/amazon-bedrock";
import { ResolveError } from "../types";
import { resolveIntentPair } from "./resolve_intent";
import { z } from "zod";
import type { CreateResponseBody, ResolvedResponse } from "common";
import { SYSTEM_PROMPT_CAT, SYSTEM_PROMPT_POL } from "./prompts";

const RETRY_POLICY = { times: 5 };

const getCategory = (prompt: string) =>
  Effect.tryPromise({
    try: () =>
      generateText({
        model: bedrock("moonshotai.kimi-k2.5"),
        system: SYSTEM_PROMPT_CAT,
        output: Output.object({
          schema: z.object({
            category: z.enum(INTENTS),
          }),
        }),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }).then((res) => res.output.category),
    catch: (error) =>
      new DataFetchError({
        reason: "APICallFailed",
        message: "Failed to classify intent category",
        cause: error,
      }),
  });

const getPolicy = (prompt: string) =>
  Effect.tryPromise({
    try: () =>
      generateText({
        model: bedrock("moonshotai.kimi-k2.5"),
        system: SYSTEM_PROMPT_POL,
        output: Output.object({
          schema: z.object({
            policy: z.enum(INTENT_POLICIES),
          }),
        }),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }).then((res) => res.output.policy),
    catch: (error) =>
      new DataFetchError({
        reason: "APICallFailed",
        message: "Failed to classify intent policy",
        cause: error,
      }),
  });

const extractTextFromInput = (
  input: CreateResponseBody["input"],
  roles: Array<"user" | "system" | "developer">,
): string | null => {
  if (typeof input === "string") {
    return input;
  }

  if (Array.isArray(input)) {
    const textContent = input
      .filter((item) => roles.includes(item.role as "user" | "system" | "developer"))
      .map((item) => item.content.text)
      .join(" ");

    return textContent || null;
  }

  return null;
};

const resolveWith = (
  prompt: string,
  pair: IntentPair,
  userProviders: string[],
  excludedResponses: ResolvedResponse[],
) =>
  Effect.gen(function* () {
    const category = yield* Effect.retry(getCategory(prompt), RETRY_POLICY);

    if (pair.intentPolicy === "auto") {
      const policy = yield* Effect.retry(getPolicy(prompt), RETRY_POLICY);
      const intentPair = new IntentPair({
        intent: category,
        intentPolicy: policy,
      });
      return yield* resolveIntentPair(intentPair, userProviders, excludedResponses);
    }

    const intentPair = new IntentPair({ intent: category, intentPolicy: pair.intentPolicy });
    return yield* resolveIntentPair(intentPair, userProviders, excludedResponses);
  });

export const resolveAuto =
  (options: CreateResponseBody, userProviders: string[], excludedResponses: ResolvedResponse[]) =>
  (pair: IntentPair) =>
    Effect.gen(function* () {
      const userPrompt = extractTextFromInput(options.input, ["user"]);
      if (userPrompt) {
        return yield* resolveWith(userPrompt, pair, userProviders, excludedResponses);
      }

      if (typeof options.instructions === "string") {
        return yield* resolveWith(options.instructions, pair, userProviders, excludedResponses);
      }

      const systemPrompt = extractTextFromInput(options.input, ["system", "developer"]);
      if (systemPrompt) {
        return yield* resolveWith(systemPrompt, pair, userProviders, excludedResponses);
      }

      return yield* new ResolveError({
        reason: "UnsupportedInputType",
        message: "We currently only support texts.",
      });
    });
