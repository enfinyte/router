import { Effect } from "effect";
import { ResolveError, ParseError } from "./types";
import type { ResolvedResponse, ResponseCreateParams } from "./types";

export const resolve = <T,>(
    options: ResponseCreateParams,
    parseFn: (input: string) => Effect.Effect<ResolvedResponse, T>,
): Effect.Effect<ResolvedResponse, ResolveError | T> =>
    Effect.gen(function*() {
        if (typeof options.model !== 'string') {
            return yield* Effect.fail(
                new ResolveError({
                    reason: "InvalidModelType",
                    message: `Expected model to be a string, got ${typeof options.model}`
                })
            );
        }


        return yield* parseFn(options.model);
    });

export const parse = (
    input: string
): Effect.Effect<ResolvedResponse, ParseError> =>
    Effect.gen(function*() {
        const firstSlashIndex = input.indexOf("/");

        if (firstSlashIndex === -1) {
            return yield* Effect.fail(new ParseError({
                reason: "BadFormatting",
                message: `Expected format "provider/model", got: "${input}"`
            }));
        }

        const provider = input.substring(0, firstSlashIndex);
        const model = input.substring(firstSlashIndex + 1);

        if (!provider) {
            return yield* Effect.fail(new ParseError({
                reason: "EmptyProvider",
                message: `Provider must be non-empty, got: "${input}"`
            }));
        }

        if (!model) {
            return yield* Effect.fail(new ParseError({
                reason: "EmptyModel",
                message: `Model must be non-empty, got: "${input}"`
            }));
        }

        const providerRegex = /^[a-zA-Z0-9_.-]+$/;

        const modelRegex = /^[a-zA-Z0-9_.-]+$/;

        if (!providerRegex.test(provider)) {
            return yield* Effect.fail(new ParseError({
                reason: "InvalidCharacters",
                message: `Provider contains invalid characters (only alphanumeric, underscore, dot, and hyphen allowed), got: "${provider}"`
            }));
        }

        if (!modelRegex.test(model)) {
            return yield* Effect.fail(new ParseError({
                reason: "InvalidCharacters",
                message: `Model contains invalid characters (only alphanumeric, underscore, dot, and hyphen allowed), got: "${model}"`
            }));
        }

        return { provider, model } as ResolvedResponse;
    });
