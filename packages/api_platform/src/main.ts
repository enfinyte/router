import { Effect } from "effect";

export const main = Effect.gen(function* () {
  yield* Effect.log("Starting API Platform server...");
  yield* Effect.never;
});
