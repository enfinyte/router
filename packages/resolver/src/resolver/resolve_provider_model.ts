import { Effect } from "effect";
import type { ProviderModelPair } from "../types";

export const resolveProviderModelPair = (pair: ProviderModelPair) =>
  Effect.succeed([{ model: pair.model, provider: pair.provider, category: null as string | null }]);
