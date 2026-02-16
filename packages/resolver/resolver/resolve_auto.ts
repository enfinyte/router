import { Effect } from "effect";

import { DataFetchError, IntentPair, INTENTS } from "../types";
import { Output, generateText } from "ai";
import { bedrock } from "@ai-sdk/amazon-bedrock";
import { ResolveError } from "../types";
import { resolveIntentPair } from "./resolve_intent";
import { z } from "zod";
import type { CreateResponseBody, ResolvedResponse } from "common";

const SYSTEM_PROMPT = `
You are an intent classification system.
Your job is to classify a user prompt into EXACTLY ONE of the following intents:
- academia
- finance
- health
- legal
- marketing
- programming
- roleplay
- science
- seo
- technology
- translation
- trivia
Definitions:
- academia → Academic writing, essays, research papers, coursework, tutoring.
- finance → Investing, trading, accounting, economics, budgeting.
- health → Medical, fitness, nutrition, mental health (informational only).
- legal → Laws, regulations, contracts, legal explanations.
- marketing → Branding, persuasion, sales copy, product positioning.
- programming → Coding, debugging, software engineering, system design.
- roleplay → Acting as a character, simulated conversations, fictional scenarios.
- science → Physics, chemistry, biology, mathematics (non-programming).
- seo → Search engine optimization, keyword targeting, ranking strategies.
- technology → Consumer tech, gadgets, infrastructure, general tech topics (non-coding).
- translation → Translating between languages.
- trivia → General knowledge questions with factual answers.
Instructions:
1. Determine the PRIMARY intent.
2. Choose exactly ONE label.
3. Do not explain your reasoning.
4. Respond ONLY with valid JSON:
{
  "category": "<one_of_the_above>",
}`;

const getCategory = (prompt: string) =>
  Effect.tryPromise({
    try: () =>
      generateText({
        model: bedrock("moonshotai.kimi-k2.5"),
        system: SYSTEM_PROMPT,
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
        message: "Failed to generate text with AI model",
        cause: error,
      }),
  });

export const resolveAuto =
  (options: CreateResponseBody, userProviders: string[], excludedResponses: ResolvedResponse[]) =>
  (pair: IntentPair) =>
    Effect.gen(function* () {
      const proritizePrompt = true;

      if (proritizePrompt) {
        if (typeof options.input === "string") {
          const category = yield* Effect.retry(getCategory(options.input), { times: 5 });
          const intentPair = new IntentPair({ intent: category, intentPolicy: pair.intentPolicy });
          return yield* resolveIntentPair(intentPair, userProviders, excludedResponses);
        }

        if (Array.isArray(options.input)) {
          const textContent = options.input
            .filter((item) => item.role === "user")
            .map((item) => item.content.text)
            .join(" ");

          if (textContent) {
            const category = yield* Effect.retry(getCategory(textContent), { times: 5 });
            const intentPair = new IntentPair({
              intent: category,
              intentPolicy: pair.intentPolicy,
            });
            return yield* resolveIntentPair(intentPair, userProviders, excludedResponses);
          }
        }
      }

      if (typeof options.instructions === "string") {
        const category = yield* Effect.retry(getCategory(options.instructions), { times: 5 });
        const intentPair = new IntentPair({ intent: category, intentPolicy: pair.intentPolicy });
        return yield* resolveIntentPair(intentPair, userProviders, excludedResponses);
      }

      if (Array.isArray(options.input)) {
        const textContent = options.input
          .filter((item) => item.role === "system" || item.role === "developer")
          .map((item) => item.content.text)
          .join(" ");

        if (textContent) {
          const category = yield* Effect.retry(getCategory(textContent), { times: 5 });
          const intentPair = new IntentPair({ intent: category, intentPolicy: pair.intentPolicy });
          return yield* resolveIntentPair(intentPair, userProviders, excludedResponses);
        }
      }

      return yield* new ResolveError({
        reason: "UnsupportedInputType",
        message: `We currently only support texts.`,
      });
    });
