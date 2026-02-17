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
const LLM_MODEL = "moonshotai.kimi-k2.5";

const getCategory = (prompt: string) =>
  Effect.tryPromise({
    try: () =>
      generateText({
        model: bedrock(LLM_MODEL),
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
  }).pipe(
    Effect.tapError((err) =>
      Effect.logError("LLM category classification failed").pipe(
        Effect.annotateLogs({
          service: "Resolver",
          operation: "getCategory",
          llmModel: LLM_MODEL,
          cause: err.cause instanceof Error ? err.cause.message : String(err.cause),
        }),
      ),
    ),
    Effect.tap((category) =>
      Effect.logDebug("LLM category classified").pipe(
        Effect.annotateLogs({
          service: "Resolver",
          operation: "getCategory",
          llmModel: LLM_MODEL,
          category,
        }),
      ),
    ),
  );

const getPolicy = (prompt: string) =>
  Effect.tryPromise({
    try: () =>
      generateText({
        model: bedrock(LLM_MODEL),
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
  }).pipe(
    Effect.tapError((err) =>
      Effect.logError("LLM policy classification failed").pipe(
        Effect.annotateLogs({
          service: "Resolver",
          operation: "getPolicy",
          llmModel: LLM_MODEL,
          cause: err.cause instanceof Error ? err.cause.message : String(err.cause),
        }),
      ),
    ),
    Effect.tap((policy) =>
      Effect.logDebug("LLM policy classified").pipe(
        Effect.annotateLogs({
          service: "Resolver",
          operation: "getPolicy",
          llmModel: LLM_MODEL,
          policy,
        }),
      ),
    ),
  );

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
    yield* Effect.logInfo("Auto-classifying with LLM").pipe(
      Effect.annotateLogs({
        service: "Resolver",
        operation: "resolveWith",
        promptLength: prompt.length,
        intentPolicy: pair.intentPolicy,
        retryPolicy: RETRY_POLICY.times,
      }),
    );

    const category = yield* Effect.retry(getCategory(prompt), RETRY_POLICY);

    yield* Effect.logInfo("Category classified").pipe(
      Effect.annotateLogs({
        service: "Resolver",
        operation: "resolveWith",
        category,
      }),
    );

    if (pair.intentPolicy === "auto") {
      yield* Effect.logDebug("Policy is auto, classifying via LLM").pipe(
        Effect.annotateLogs({ service: "Resolver", operation: "resolveWith" }),
      );

      const policy = yield* Effect.retry(getPolicy(prompt), RETRY_POLICY);

      yield* Effect.logInfo("Policy classified").pipe(
        Effect.annotateLogs({
          service: "Resolver",
          operation: "resolveWith",
          policy,
        }),
      );

      const intentPair = new IntentPair({
        intent: category,
        intentPolicy: policy,
      });
      return yield* resolveIntentPair(intentPair, userProviders, excludedResponses);
    }

    const intentPair = new IntentPair({ intent: category, intentPolicy: pair.intentPolicy });
    return yield* resolveIntentPair(intentPair, userProviders, excludedResponses);
  });

/**
 * Extracts the appropriate text for auto-classification based on analysisTarget.
 *
 * - "per_system_prompt": prioritizes system/developer prompt and instructions.
 *   Returns null if none found (caller should use fallback model).
 * - "per_prompt" (default): prioritizes user prompt, then instructions, then system prompt.
 */
const extractAnalysisText = (
  options: CreateResponseBody,
  analysisTarget: string | undefined,
): { text: string; source: string } | null => {
  if (analysisTarget === "per_system_prompt") {
    // System prompt mode: look for system/developer messages first, then instructions
    const systemPrompt = extractTextFromInput(options.input, ["system", "developer"]);
    if (systemPrompt) return { text: systemPrompt, source: "systemPrompt" };

    if (typeof options.instructions === "string" && options.instructions.length > 0) {
      return { text: options.instructions, source: "instructions" };
    }

    // No system prompt found — caller should use fallback model
    return null;
  }

  // Default: per_prompt — prioritize user prompt, then instructions, then system prompt
  const userPrompt = extractTextFromInput(options.input, ["user"]);
  if (userPrompt) return { text: userPrompt, source: "userPrompt" };

  if (typeof options.instructions === "string" && options.instructions.length > 0) {
    return { text: options.instructions, source: "instructions" };
  }

  const systemPrompt = extractTextFromInput(options.input, ["system", "developer"]);
  if (systemPrompt) return { text: systemPrompt, source: "systemPrompt" };

  return null;
};

export const resolveAuto =
  (options: CreateResponseBody, userProviders: string[], excludedResponses: ResolvedResponse[], analysisTarget: string | undefined = undefined) =>
  (pair: IntentPair) =>
    Effect.gen(function* () {
      const extracted = extractAnalysisText(options, analysisTarget);

      if (!extracted) {
        if (analysisTarget === "per_system_prompt") {
          yield* Effect.logInfo("No system prompt found for per_system_prompt analysis, signaling fallback").pipe(
            Effect.annotateLogs({
              service: "Resolver",
              operation: "resolveAuto",
              analysisTarget,
            }),
          );

          return yield* new ResolveError({
            reason: "UnsupportedInputType",
            message: "No system prompt found. Using fallback model.",
          });
        }

        yield* Effect.logError("No extractable text for auto-classification").pipe(
          Effect.annotateLogs({
            service: "Resolver",
            operation: "resolveAuto",
            inputType: typeof options.input,
            analysisTarget: analysisTarget ?? "per_prompt",
          }),
        );

        return yield* new ResolveError({
          reason: "UnsupportedInputType",
          message: "We currently only support texts.",
        });
      }

      yield* Effect.logDebug(`Using ${extracted.source} for auto-classification`).pipe(
        Effect.annotateLogs({
          service: "Resolver",
          operation: "resolveAuto",
          source: extracted.source,
          promptLength: extracted.text.length,
          analysisTarget: analysisTarget ?? "per_prompt",
        }),
      );

      return yield* resolveWith(extracted.text, pair, userProviders, excludedResponses);
    });
