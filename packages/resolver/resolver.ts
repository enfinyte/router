import { Effect } from "effect";
import { ResolveError } from "./types";
import type { ResolvedResponse, ResponseCreateParams } from "./types";

export const resolve = <T>(
  options: ResponseCreateParams,
  parseFn: (input: string) => Effect.Effect<ResolvedResponse, T>,
): Effect.Effect<ResolvedResponse, ResolveError | T> =>
  Effect.gen(function* () {
    if (typeof options.model !== "string") {
      return yield* Effect.fail(
        new ResolveError({
          reason: "InvalidModelType",
          message: `Expected model to be a string, got ${typeof options.model}`,
        }),
      );
    }

    return yield* parseFn(options.model);
  });
