import { Effect } from "effect";
import { ParseError } from "./types";
import type { ResolvedResponse } from "./types";

export const parse = (input: string): Effect.Effect<ResolvedResponse, ParseError> =>
  Effect.gen(function* () {
    const firstSlashIndex = input.indexOf("/");

    if (firstSlashIndex === -1) {
      return yield* Effect.fail(
        new ParseError({
          reason: "BadFormatting",
          message: `Expected format "provider/model", got: "${input}"`,
        }),
      );
    }

    const provider = input.substring(0, firstSlashIndex);
    const model = input.substring(firstSlashIndex + 1);

    if (!provider) {
      return yield* Effect.fail(
        new ParseError({
          reason: "EmptyProvider",
          message: `Provider must be non-empty, got: "${input}"`,
        }),
      );
    }

    if (!model) {
      return yield* Effect.fail(
        new ParseError({
          reason: "EmptyModel",
          message: `Model must be non-empty, got: "${input}"`,
        }),
      );
    }

    const providerRegex = /^[a-zA-Z0-9_.-]+$/;

    const modelRegex = /^[a-zA-Z0-9_.-]+$/;

    if (!providerRegex.test(provider)) {
      return yield* Effect.fail(
        new ParseError({
          reason: "InvalidCharacters",
          message: `Provider contains invalid characters (only alphanumeric, underscore, dot, and hyphen allowed), got: "${provider}"`,
        }),
      );
    }

    if (!modelRegex.test(model)) {
      return yield* Effect.fail(
        new ParseError({
          reason: "InvalidCharacters",
          message: `Model contains invalid characters (only alphanumeric, underscore, dot, and hyphen allowed), got: "${model}"`,
        }),
      );
    }

    return { provider, model } as ResolvedResponse;
  });
