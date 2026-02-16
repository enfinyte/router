import { Effect, Schema } from "effect";
import { IntentPair, Intent, IntentPolicy, IntentParseError } from "../types";

export const isIntent = (value: string): value is Intent => Schema.is(Intent)(value.toLowerCase());

export const parseIntentImpl = (input: string) =>
  Effect.gen(function* () {
    const firstSlashIndex = input.indexOf("/");

    if (firstSlashIndex === -1) {
      yield* Effect.logWarning("Intent parse failed: missing separator").pipe(
        Effect.annotateLogs({
          service: "Parser",
          operation: "parseIntent",
          input,
          reason: "BadFormatting",
        }),
      );
      return yield* new IntentParseError({
        reason: "BadFormatting",
        message: `Expected format "intent/intentPolicy", got: "${input}"`,
      });
    }

    const rawIntent = input.substring(0, firstSlashIndex);
    const rawPolicy = input.substring(firstSlashIndex + 1);

    if (!rawIntent) {
      yield* Effect.logWarning("Intent parse failed: empty intent").pipe(
        Effect.annotateLogs({
          service: "Parser",
          operation: "parseIntent",
          input,
          reason: "EmptyIntent",
        }),
      );
      return yield* new IntentParseError({
        reason: "EmptyIntent",
        message: `Intent must be non-empty, got: "${input}"`,
      });
    }

    if (!rawPolicy) {
      yield* Effect.logWarning("Intent parse failed: empty policy").pipe(
        Effect.annotateLogs({
          service: "Parser",
          operation: "parseIntent",
          input,
          reason: "EmptyIntentPolicy",
        }),
      );
      return yield* new IntentParseError({
        reason: "EmptyIntentPolicy",
        message: `intentPolicy must be non-empty, got: "${input}"`,
      });
    }

    const intent = yield* Schema.decodeUnknown(Intent)(rawIntent.toLowerCase()).pipe(
      Effect.tapError(() =>
        Effect.logWarning("Intent parse failed: invalid intent literal").pipe(
          Effect.annotateLogs({ service: "Parser", operation: "parseIntent", rawIntent }),
        ),
      ),
      Effect.mapError(
        () =>
          new IntentParseError({
            reason: "InvalidCharacters",
            message: `Intent contains invalid literal, got: "${rawIntent}"`,
          }),
      ),
    );

    const intentPolicy = yield* Schema.decodeUnknown(IntentPolicy)(rawPolicy.toLowerCase()).pipe(
      Effect.tapError(() =>
        Effect.logWarning("Intent parse failed: invalid policy literal").pipe(
          Effect.annotateLogs({ service: "Parser", operation: "parseIntent", rawPolicy }),
        ),
      ),
      Effect.mapError(
        () =>
          new IntentParseError({
            reason: "InvalidCharacters",
            message: `IntentPolicy contains invalid literal, got: "${rawPolicy}"`,
          }),
      ),
    );

    yield* Effect.logDebug("Intent parsed").pipe(
      Effect.annotateLogs({ service: "Parser", operation: "parseIntent", intent, intentPolicy }),
    );

    return new IntentPair({ intent, intentPolicy });
  });
