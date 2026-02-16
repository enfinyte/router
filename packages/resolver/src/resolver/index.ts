import { Effect, Match, pipe } from "effect";
import { parseImpl } from "../parser";
import { ResolveError } from "../types";
import type { IntentPair, ProviderModelPair } from "../types";
import { resolveProviderModelPair } from "./resolve_provider_model";
import { resolveIntentPair } from "./resolve_intent";
import { resolveAuto } from "./resolve_auto";
import { parseIntentImpl } from "../parser/parse_intent";
import type { CreateResponseBody, ResolvedResponse } from "common";

const resolve = (userProviders: string[], excludedResponses: ResolvedResponse[]) =>
  Match.type<IntentPair | ProviderModelPair>().pipe(
    Match.tag("IntentPair", (pair) => resolveIntentPair(pair, userProviders, excludedResponses)),
    Match.tag("ProviderModelPair", resolveProviderModelPair),
    Match.exhaustive,
  );

export const resolveImpl = (
  options: CreateResponseBody,
  userProviders: string[],
  excludedResponses: ResolvedResponse[],
) =>
  Effect.gen(function* () {
    if (typeof options.model !== "string") {
      yield* Effect.logError("Invalid model type").pipe(
        Effect.annotateLogs({
          service: "Resolver",
          operation: "resolve",
          modelType: typeof options.model,
        }),
      );
      return yield* new ResolveError({
        reason: "InvalidModelType",
        message: `Expected model to be a string, got ${typeof options.model}`,
      });
    }

    if (options.model.startsWith("auto")) {
      yield* Effect.logInfo("Resolving via auto-classification").pipe(
        Effect.annotateLogs({
          service: "Resolver",
          operation: "resolve",
          model: options.model,
          providerCount: userProviders.length,
          excludedCount: excludedResponses.length,
        }),
      );
      return yield* pipe(
        options.model,
        parseIntentImpl,
        Effect.flatMap(resolveAuto(options, userProviders, excludedResponses)),
      );
    }

    yield* Effect.logInfo("Resolving via direct parse").pipe(
      Effect.annotateLogs({
        service: "Resolver",
        operation: "resolve",
        model: options.model,
        providerCount: userProviders.length,
        excludedCount: excludedResponses.length,
      }),
    );

    return yield* pipe(
      options.model,
      parseImpl,
      Effect.flatMap(resolve(userProviders, excludedResponses)),
    );
  });
