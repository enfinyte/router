import type { CreateResponseBody } from "common";

import { Effect, pipe } from "effect";

import { parseImpl } from "../parser";
import { parseIntentImpl } from "../parser/parse_intent";
import { ResolveError } from "../types";
import { resolveAuto } from "./resolve_auto";
import { resolveIntentPair } from "./resolve_intent";
import { resolveProviderModelPair } from "./resolve_provider_model";

export const resolveImpl = (
  options: Pick<CreateResponseBody, "model">,
  userId: string,
  userProviders: string[],
  analysisTarget: string,
) =>
  Effect.gen(function* () {
    if (typeof options.model !== "string") {
      return yield* new ResolveError({
        reason: "InvalidModelType",
        message: `Expected model to be a string, got ${typeof options.model}`,
      });
    }

    if (options.model.startsWith("auto")) {
      return yield* pipe(
        options.model,
        parseIntentImpl,
        Effect.flatMap(resolveAuto(options, userId, userProviders, analysisTarget)),
      );
    }

    return yield* pipe(
      options.model,
      parseImpl,
      Effect.flatMap((parsed) => {
        if (parsed._tag === "IntentPair") return resolveIntentPair(parsed, userProviders);
        return resolveProviderModelPair(parsed);
      }),
    );
  });
