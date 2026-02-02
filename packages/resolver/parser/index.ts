import { Effect } from "effect";
import { isIntent, parseIntentImpl } from "./parse_intent";
import { parseProviderModelImpl } from "./parse_provider_model";
import type {
  IntentPair,
  IntentParseError,
  ProviderModelPair,
  ProviderModelParseError,
} from "../types";
import { ParseError } from "../types";

export const parseImpl = (
  model: string,
): Effect.Effect<
  IntentPair | ProviderModelPair,
  ParseError | IntentParseError | ProviderModelParseError
> =>
  Effect.gen(function* () {
    const firstSlashIndex = model.indexOf("/");
    if (firstSlashIndex === -1) {
      return yield* Effect.fail(
        new ParseError({
          reason: "BadFormatting",
          message: `Expected format "{}/{}", got: "${model}"`,
        }),
      );
    }
    const intent = model.substring(0, firstSlashIndex);

    if (isIntent(intent)) {
      return yield* parseIntentImpl(model);
    }
    return yield* parseProviderModelImpl(model);
  });
