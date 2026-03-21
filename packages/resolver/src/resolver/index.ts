import type { CreateResponseBody } from "common";

import { Effect, Match, pipe } from "effect";

import type { IntentPair, ProviderModelPair } from "../types";

import { parseImpl } from "../parser";
import { parseIntentImpl } from "../parser/parse_intent";
import { ResolveError } from "../types";
import { resolveAuto } from "./resolve_auto";
import { resolveIntentPair } from "./resolve_intent";
import { resolveProviderModelPair } from "./resolve_provider_model";

const resolve = (userProviders: string[]) =>
  Match.type<IntentPair | ProviderModelPair>().pipe(
    Match.tag("IntentPair", (pair) => resolveIntentPair(pair, userProviders)),
    Match.tag("ProviderModelPair", resolveProviderModelPair),
    Match.exhaustive,
  );

export const resolveImpl = (
  options: Pick<CreateResponseBody, "model">,
  userProviders: string[],
  analysisTarget: string,
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
        }),
      );
      return yield* pipe(
        options.model,
        parseIntentImpl,
        Effect.flatMap(resolveAuto(options, userProviders, analysisTarget)),
      );
    }

    yield* Effect.logInfo("Resolving via direct parse").pipe(
      Effect.annotateLogs({
        service: "Resolver",
        operation: "resolve",
        model: options.model,
        providerCount: userProviders.length,
      }),
    );

    return yield* pipe(options.model, parseImpl, Effect.flatMap(resolve(userProviders)));
  });
