import { Effect } from "effect";
import type { ProviderModelPair, ResolvedResponse } from "../types";

export const resolveProviderModelPair = (
  pair: ProviderModelPair,
): Effect.Effect<ResolvedResponse> =>
  Effect.succeed({ model: pair.model, provider: pair.provider });
