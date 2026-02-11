import { Effect, Schema } from "effect";
import { IntentPair, Intent, IntentPolicy, IntentParseError } from "../types";

export const isIntent = (value: string): value is Intent => Schema.is(Intent)(value.toLowerCase());

export const parseIntentImpl = (input: string) =>
  Effect.gen(function* () {
    const firstSlashIndex = input.indexOf("/");

    if (firstSlashIndex === -1) {
      return yield* new IntentParseError({
        reason: "BadFormatting",
        message: `Expected format "intent/intentPolicy", got: "${input}"`,
      });
    }

    const rawIntent = input.substring(0, firstSlashIndex);
    const rawPolicy = input.substring(firstSlashIndex + 1);

    if (!rawIntent) {
      return yield* new IntentParseError({
        reason: "EmptyIntent",
        message: `Intent must be non-empty, got: "${input}"`,
      });
    }

    if (!rawPolicy) {
      return yield* new IntentParseError({
        reason: "EmptyIntentPolicy",
        message: `intentPolicy must be non-empty, got: "${input}"`,
      });
    }

    const intent = yield* Schema.decodeUnknown(Intent)(rawIntent.toLowerCase()).pipe(
      Effect.mapError(
        () =>
          new IntentParseError({
            reason: "InvalidCharacters",
            message: `Intent contains invalid literal, got: "${rawIntent}"`,
          }),
      ),
    );

    const intentPolicy = yield* Schema.decodeUnknown(IntentPolicy)(rawPolicy.toLowerCase()).pipe(
      Effect.mapError(
        () =>
          new IntentParseError({
            reason: "InvalidCharacters",
            message: `IntentPolicy contains invalid literal, got: "${rawPolicy}"`,
          }),
      ),
    );

    return new IntentPair({ intent, intentPolicy });
  });
