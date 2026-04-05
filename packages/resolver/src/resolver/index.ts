import type { CreateResponseBody } from "common";

import { Effect, pipe } from "effect";

import { resolverLog } from "../log";
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
    const l = resolverLog("resolve");

    if (typeof options.model !== "string") {
      return yield* new ResolveError({
        reason: "InvalidModelType",
        message: `Expected model to be a string, got ${typeof options.model}`,
      });
    }

    yield* l.info("Resolve request received", {
      model: options.model,
      providerCount: userProviders.length,
      analysisTarget: analysisTarget ?? "per_prompt",
    });

    const result = yield* (() => {
      if (options.model.startsWith("auto")) {
        return pipe(
          options.model,
          parseIntentImpl,
          Effect.flatMap(resolveAuto(options as CreateResponseBody, userId, userProviders, analysisTarget)),
        );
      }

      return pipe(
        options.model,
        parseImpl,
        Effect.flatMap((parsed) => {
          if (parsed._tag === "IntentPair") return resolveIntentPair(parsed, userProviders);
          return resolveProviderModelPair(parsed);
        }),
      );
    })();

    yield* l.info("Resolve completed", { pairs_length: result.length });

    return result;
  });
