import { Effect } from "effect";
import { IntentPair } from "../types";
import { IntentParseError, intentMap, intentPolicyMap } from "../types";

export const isIntent = (model: string) => {
  return intentMap[model.toLowerCase()] !== undefined;
};

const toIntent = (model: string) => {
  return intentMap[model.toLowerCase()]!;
};

const isIntentPolicy = (model: string) => {
  return intentPolicyMap[model.toLowerCase()] !== undefined;
};

const toIntentPolicy = (model: string) => {
  return intentPolicyMap[model.toLowerCase()]!;
};

export const parseIntentImpl = (input: string): Effect.Effect<IntentPair, IntentParseError> =>
  Effect.gen(function* () {
    const firstSlashIndex = input.indexOf("/");

    if (firstSlashIndex === -1) {
      return yield* Effect.fail(
        new IntentParseError({
          reason: "BadFormatting",
          message: `Expected format "intent/intentPolicy", got: "${input}"`,
        }),
      );
    }

    const intent = input.substring(0, firstSlashIndex);
    const intentPolicy = input.substring(firstSlashIndex + 1);

    if (!intent) {
      return yield* Effect.fail(
        new IntentParseError({
          reason: "EmptyIntent",
          message: `Intent must be non-empty, got: "${input}"`,
        }),
      );
    }

    if (!intentPolicy) {
      return yield* Effect.fail(
        new IntentParseError({
          reason: "EmptyIntentPolicy",
          message: `intentPolicy must be non-empty, got: "${input}"`,
        }),
      );
    }

    if (!isIntent(intent)) {
      return yield* Effect.fail(
        new IntentParseError({
          reason: "InvalidCharacters",
          message: `Intent contains invalid literal, got: "${intent}"`,
        }),
      );
    }

    if (!isIntentPolicy(intentPolicy)) {
      return yield* Effect.fail(
        new IntentParseError({
          reason: "InvalidCharacters",
          message: `IntentPolicy contains invalid literal, got: "${intentPolicy}"`,
        }),
      );
    }

    return new IntentPair({ intent: toIntent(intent), intentPolicy: toIntentPolicy(intentPolicy) });
  });
