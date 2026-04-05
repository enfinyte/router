import type { CreateResponseBody } from "common";

import { Effect } from "effect";

import { resolverLog } from "../log";
import { getResolvedResponse, setResolvedResponse } from "../redis";
import { IntentPair, ResolveError } from "../types";
import { classifyCategory, classifyPolicy, RETRY_POLICY } from "./classify";
import { extractAnalysisText } from "./extract_text";
import { resolveIntentPair } from "./resolve_intent";

const resolveWith = (
  prompt: { text: string; source: string },
  pair: IntentPair,
  userId: string,
  userProviders: string[],
) =>
  Effect.gen(function* () {
    const l = resolverLog("resolveWith");

    yield* l.info("Auto-classifying with LLM", {
      promptLength: prompt.text.length,
      intentPolicy: pair.intentPolicy,
    });

    if (prompt.source === "per_system_prompt") {
      const cached = yield* getResolvedResponse(userId, prompt.text);
      if (cached) {
        yield* l.info("Prompt cache hit");
        return cached;
      }
    }

    const category = yield* Effect.retry(classifyCategory(prompt.text), RETRY_POLICY);
    yield* l.info("Category classified", { category });

    const policy =
      pair.intentPolicy === "auto"
        ? yield* Effect.retry(classifyPolicy(prompt.text), RETRY_POLICY)
        : pair.intentPolicy;

    if (pair.intentPolicy === "auto") {
      yield* l.info("Policy classified", { policy });
    }

    const intentPair = new IntentPair({
      intent: category as IntentPair["intent"],
      intentPolicy: policy as IntentPair["intentPolicy"],
    });

    const resolvedResponse = yield* resolveIntentPair(intentPair, userProviders);
    const withCategory = resolvedResponse.map((p) => ({ ...p, category: category as string | null }));

    if (prompt.source === "per_system_prompt") {
      yield* setResolvedResponse(userId, prompt.text, withCategory);
      yield* l.info("Prompt cached");
    }

    return withCategory;
  });

export const resolveAuto =
  (options: CreateResponseBody, userId: string, userProviders: string[], analysisTarget: string) =>
  (pair: IntentPair) =>
    Effect.gen(function* () {
      const l = resolverLog("resolveAuto");
      const extracted = extractAnalysisText(options, analysisTarget);

      if (!extracted) {
        if (analysisTarget === "per_system_prompt") {
          yield* l.info("No system prompt found for per_system_prompt analysis, signaling fallback", {
            analysisTarget,
          });
          return yield* new ResolveError({
            reason: "UnsupportedInputType",
            message: "No system prompt found. Using fallback model.",
          });
        }

        yield* l.error("No extractable text for auto-classification", {
          inputType: typeof options.input,
          analysisTarget,
        });
        return yield* new ResolveError({
          reason: "UnsupportedInputType",
          message: "We currently only support texts.",
        });
      }

      yield* l.debug(`Using ${extracted.source} for auto-classification`, {
        source: extracted.source,
        promptLength: extracted.text.length,
        analysisTarget,
      });

      return yield* resolveWith(extracted, pair, userId, userProviders);
    });
