import { Effect, Match } from "effect";
import { parseImpl } from "../parser";
import { ResolveError } from "../types";
import type { IntentPair, ProviderModelPair, ResponseCreateParams } from "../types";
import { resolveProviderModelPair } from "./resolve_provider_model";
import { resolveIntentPair } from "./resolve_intent";

const resolve = Match.type<IntentPair | ProviderModelPair>().pipe(
  Match.tag("IntentPair", resolveIntentPair),
  Match.tag("ProviderModelPair", resolveProviderModelPair),
  Match.exhaustive,
);

export const resolveImpl = (options: ResponseCreateParams) =>
  Effect.gen(function* () {
    if (typeof options.model !== "string") {
      return yield* Effect.fail(
        new ResolveError({
          reason: "InvalidModelType",
          message: `Expected model to be a string, got ${typeof options.model}`,
        }),
      );
    }

    const parsed = yield* parseImpl(options.model);
    const resolved = yield* resolve(parsed);
    return resolved;
  });
