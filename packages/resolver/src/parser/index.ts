import { Effect } from "effect";
import { isIntent, parseIntentImpl } from "./parse_intent";
import { parseProviderModelImpl } from "./parse_provider_model";
import { ProviderModelParseError } from "../types";

export const parseImpl = (model: string) =>
  Effect.gen(function* () {
    yield* Effect.logDebug("Parsing model string").pipe(
      Effect.annotateLogs({ service: "Parser", operation: "parse", model }),
    );

    const firstSlashIndex = model.indexOf("/");
    if (firstSlashIndex === -1) {
      yield* Effect.logWarning("Model string missing separator").pipe(
        Effect.annotateLogs({ service: "Parser", operation: "parse", model, reason: "BadFormatting" }),
      );
      return yield* new ProviderModelParseError({
        reason: "BadFormatting",
        message: `Expected format "{}/{}", got: "${model}"`,
      });
    }
    const prefix = model.substring(0, firstSlashIndex);

    if (isIntent(prefix)) {
      yield* Effect.logDebug("Parsed as intent").pipe(
        Effect.annotateLogs({ service: "Parser", operation: "parse", model, prefix, type: "IntentPair" }),
      );
      return yield* parseIntentImpl(model);
    }

    yield* Effect.logDebug("Parsed as provider/model").pipe(
      Effect.annotateLogs({ service: "Parser", operation: "parse", model, prefix, type: "ProviderModelPair" }),
    );
    return yield* parseProviderModelImpl(model);
  });
