import { Effect } from "effect";
import type { ProviderModelPair } from "../types";
import type { ResolvedResponse } from "common";

export const resolveProviderModelPair = (
  pair: ProviderModelPair,
): Effect.Effect<ResolvedResponse> =>
  Effect.succeed({ model: pair.model, provider: pair.provider });
