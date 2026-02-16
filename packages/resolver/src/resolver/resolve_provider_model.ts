import { Effect } from "effect";
import type { ProviderModelPair } from "../types";
import type { ResolvedResponse } from "common";

export const resolveProviderModelPair = (
  pair: ProviderModelPair,
): Effect.Effect<ResolvedResponse> =>
  Effect.succeed({ model: pair.model, provider: pair.provider }).pipe(
    Effect.tap((resolved) =>
      Effect.logDebug("Provider/model passthrough resolved").pipe(
        Effect.annotateLogs({
          service: "Resolver",
          operation: "resolveProviderModel",
          provider: resolved.provider,
          model: resolved.model,
        }),
      ),
    ),
  );
