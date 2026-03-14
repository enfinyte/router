import { Effect } from "effect";
import type { ProviderModelPair } from "../types";

export const resolveProviderModelPair = (pair: ProviderModelPair) =>
  Effect.succeed([{ model: pair.model, provider: pair.provider }]).pipe(
    Effect.tap((resolved) =>
      Effect.logDebug("Provider/model passthrough resolved").pipe(
        Effect.annotateLogs({
          service: "Resolver",
          operation: "resolveProviderModel",
          resolved,
        }),
      ),
    ),
  );
