import { Effect } from "effect";
import { isIntent, parseIntentImpl } from "./parse_intent";
import { parseProviderModelImpl } from "./parse_provider_model";
import { ProviderModelParseError } from "../types";

export const parseImpl = (model: string) =>
  Effect.gen(function* () {
    const firstSlashIndex = model.indexOf("/");
    if (firstSlashIndex === -1) {
      return yield* new ProviderModelParseError({
        reason: "BadFormatting",
        message: `Expected format "{}/{}", got: "${model}"`,
      });
    }
    const prefix = model.substring(0, firstSlashIndex);

    if (isIntent(prefix)) {
      return yield* parseIntentImpl(model);
    }
    return yield* parseProviderModelImpl(model);
  });
