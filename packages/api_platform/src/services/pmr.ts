import { Effect, Data } from "effect";
import { resolve as resolverModelAndProvider } from "resolver";
import type { CreateResponseBody, ResolvedResponse } from "common";
import { isNotNullable } from "effect/Predicate";
import { classificationCache } from "./classification-cache";

export class PMRError extends Data.TaggedError("PMRError")<{
  cause?: unknown;
  message?: string;
}> {}

const extractSystemPromptText = (
  input: CreateResponseBody["input"],
  instructions: string | undefined,
): string | null => {
  if (Array.isArray(input)) {
    const text = input
      .filter((item) => item.role === "system" || item.role === "developer")
      .map((item) => item.content.text)
      .join(" ");
    if (text) return text;
  }

  if (typeof instructions === "string" && instructions.length > 0) return instructions;

  return null;
};

export const resolve = ({
  createResponseBody,
  userProviders,
  excludedResponses = [],
  analysisTarget = undefined,
  userId,
}: {
  createResponseBody: CreateResponseBody;
  userProviders: string[];
  excludedResponses?: ResolvedResponse[];
  analysisTarget?: string | undefined;
  userId: string;
}) =>
  Effect.gen(function* () {
    const isAutoRoute =
      isNotNullable(createResponseBody.model) && createResponseBody.model.startsWith("auto");

    const useSystemPromptCache = analysisTarget === "per_system_prompt" && isAutoRoute;
    const systemPromptText = useSystemPromptCache
      ? extractSystemPromptText(
          createResponseBody.input,
          createResponseBody.instructions ?? undefined,
        )
      : null;

    let cachedResult: ResolvedResponse | undefined;
    if (useSystemPromptCache && systemPromptText) {
      cachedResult = yield* Effect.promise(() => classificationCache.get(userId, systemPromptText));
      if (cachedResult) {
        yield* Effect.logInfo("Using cached classification for system prompt").pipe(
          Effect.annotateLogs({
            service: "AIService",
            operation: "pmrRoutine",
            cachedProvider: cachedResult.provider,
            cachedModel: cachedResult.model,
          }),
        );
      }
    }

    const resolvedModelAndProvider = yield* resolverModelAndProvider({
      options: createResponseBody,
      userProviders,
      excludedResponses,
      analysisTarget,
    }).pipe(
      Effect.mapError(
        (error) =>
          new PMRError({
            cause: error,
            message: `Model resolution failed`,
          }),
      ),
    );

    if (useSystemPromptCache && systemPromptText && !cachedResult) {
      yield* Effect.promise(() =>
        classificationCache.set(userId, systemPromptText, resolvedModelAndProvider),
      );
      yield* Effect.logDebug("Cached classification result for system prompt").pipe(
        Effect.annotateLogs({
          service: "AIService",
          operation: "pmrRoutine",
          cachedProvider: resolvedModelAndProvider.provider,
          cachedModel: resolvedModelAndProvider.model,
        }),
      );
    }

    return resolvedModelAndProvider;
  });
