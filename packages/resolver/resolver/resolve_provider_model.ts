import { Effect } from "effect";
import type { ProviderModelPair, ResolvedResponse } from "../types";

export const resolveProviderModelPair = (pair: ProviderModelPair) =>
  Effect.gen(function* () {
    return pair as ResolvedResponse;
  });
