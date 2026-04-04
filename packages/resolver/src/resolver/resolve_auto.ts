import type { CreateResponseBody } from "common";

import { bedrock } from "@ai-sdk/amazon-bedrock";
import { Output, generateText } from "ai";
import { Effect } from "effect";
import { z } from "zod";

import { getResolvedResponse, setResolvedResponse } from "../redis";
import { CATEGORIES, DataFetchError, IntentPair, ORDERS } from "../types";
import { ResolveError } from "../types";
import { SYSTEM_PROMPT_CAT, SYSTEM_PROMPT_POL } from "./prompts";
import { resolveIntentPair } from "./resolve_intent";

const RETRY_POLICY = { times: 5 };
const LLM_MODEL = "moonshotai.kimi-k2.5";

const classifyWithLLM = (
  prompt: string,
  systemPrompt: string,
  schema: z.ZodType,
  fieldName: string,
  operationName: string,
) =>
  Effect.tryPromise({
    try: () =>
      generateText({
        model: bedrock(LLM_MODEL),
        system: systemPrompt,
        output: Output.object({ schema }),
        messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
      }).then((res) => (res.output as Record<string, string>)[fieldName]!),
    catch: (error) =>
      new DataFetchError({
        reason: "APICallFailed",
        message: `Failed to classify ${operationName}`,
        cause: error,
      }),
  }).pipe(
    Effect.tapError((err) =>
      Effect.logError(`LLM ${operationName} classification failed`).pipe(
        Effect.annotateLogs({
          service: "Resolver",
          operation: operationName,
          llmModel: LLM_MODEL,
          cause: err.cause instanceof Error ? err.cause.message : String(err.cause),
        }),
      ),
    ),
    Effect.tap((result) =>
      Effect.logDebug(`LLM ${operationName} classified`).pipe(
        Effect.annotateLogs({
          service: "Resolver",
          operation: operationName,
          llmModel: LLM_MODEL,
          result,
        }),
      ),
    ),
  );

const getCategory = (prompt: string) =>
  classifyWithLLM(
    prompt,
    SYSTEM_PROMPT_CAT,
    z.object({ category: z.enum(CATEGORIES) }),
    "category",
    "getCategory",
  );

const getPolicy = (prompt: string) =>
  classifyWithLLM(
    prompt,
    SYSTEM_PROMPT_POL,
    z.object({ policy: z.enum(ORDERS) }),
    "policy",
    "getPolicy",
  );

const extractTextFromInput = (
  input: CreateResponseBody["input"],
  roles: Array<"user" | "system" | "developer">,
): string | null => {
  if (roles.includes("user") && typeof input === "string") {
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
  prompt: {
    text: string;
    source: string;
  },
  pair: IntentPair,
  userId: string,
  userProviders: string[],
) =>
  Effect.gen(function* () {
    yield* Effect.logInfo("Auto-classifying with LLM").pipe(
      Effect.annotateLogs({
        service: "Resolver",
        operation: "resolveWith",
        promptLength: prompt.text.length,
        intentPolicy: pair.intentPolicy,
        retryPolicy: RETRY_POLICY.times,
      }),
    );

    if (prompt.source === "per_system_prompt") {
      const cached = yield* getResolvedResponse(userId, prompt.text);

      if (cached) {
        yield* Effect.logInfo("Prompt cache hit").pipe(
          Effect.annotateLogs({
            service: "Resolver",
            operation: "resolveWith",
            message: "Serving cached data.",
          }),
        );
        return cached;
      }
    }

    const category = yield* Effect.retry(getCategory(prompt.text), RETRY_POLICY);

    yield* Effect.logInfo("Category classified").pipe(
      Effect.annotateLogs({
        service: "Resolver",
        operation: "resolveWith",
        category,
      }),
    );

    const policy =
      pair.intentPolicy === "auto"
        ? yield* Effect.retry(getPolicy(prompt.text), RETRY_POLICY)
        : pair.intentPolicy;

    if (pair.intentPolicy === "auto") {
      yield* Effect.logInfo("Policy classified").pipe(
        Effect.annotateLogs({
          service: "Resolver",
          operation: "resolveWith",
          policy,
        }),
      );
    }

    const intentPair = new IntentPair({
      intent: category as IntentPair["intent"],
      intentPolicy: policy as IntentPair["intentPolicy"],
    });

    const resolvedResponse = yield* resolveIntentPair(intentPair, userProviders);
    const withCategory = resolvedResponse.map((p) => ({ ...p, category: category as string | null }));

    if (prompt.source === "per_system_prompt") {
      yield* setResolvedResponse(userId, prompt.text, withCategory);

      yield* Effect.logInfo("Prompt cached.").pipe(
        Effect.annotateLogs({
          service: "Resolver",
          operation: "resolveWith",
          message: "Cache event.",
        }),
      );
    }

    return withCategory;
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
  analysisTarget: string,
): { text: string; source: string } | null => {
  if (analysisTarget === "per_system_prompt") {
    const systemPrompt = extractTextFromInput(options.input, ["system", "developer"]);
    if (systemPrompt) return { text: systemPrompt, source: "per_system_prompt" };

    if (typeof options.instructions === "string" && options.instructions.length > 0) {
      return { text: options.instructions, source: "per_system_prompt" };
    }

    return null;
  }

  const userPrompt = extractTextFromInput(options.input, ["user"]);
  if (userPrompt) return { text: userPrompt, source: "per_prompt" };

  return null;
};

export const resolveAuto =
  (options: CreateResponseBody, userId: string, userProviders: string[], analysisTarget: string) =>
  (pair: IntentPair) =>
    Effect.gen(function* () {
      const extracted = extractAnalysisText(options, analysisTarget);

      if (!extracted) {
        if (analysisTarget === "per_system_prompt") {
          yield* Effect.logInfo(
            "No system prompt found for per_system_prompt analysis, signaling fallback",
          ).pipe(
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
            analysisTarget: analysisTarget,
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

      return yield* resolveWith(extracted, pair, userId, userProviders);
    });
