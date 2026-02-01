import { Effect } from "effect";
import { ResolveError } from "./types";
import type { ResolvedResponse, ResponseCreateParams } from "./types";

interface IResolveImpl<T, U> {
  options: ResponseCreateParams;
  parseModelImpl: (input: string) => Effect.Effect<ResolvedResponse, T>;
  isIntent: (model: string) => boolean;
  intentImpl: (input: string) => Effect.Effect<ResolvedResponse, U>;
}

export const resolveImpl = <T, U>({
  options,
  parseModelImpl,
  isIntent,
  intentImpl,
}: IResolveImpl<T, U>): Effect.Effect<ResolvedResponse, ResolveError | T | U> =>
  Effect.gen(function* () {
    if (typeof options.model !== "string") {
      return yield* Effect.fail(
        new ResolveError({
          reason: "InvalidModelType",
          message: `Expected model to be a string, got ${typeof options.model}`,
        }),
      );
    }

    if (isIntent(options.model)) {
      return yield* intentImpl(options.model);
    } else {
      return yield* parseModelImpl(options.model);
    }
  });
