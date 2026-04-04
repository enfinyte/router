import type { ProviderModelPair } from "./intent";

export interface VerifyApiKeyResult {
  readonly valid: boolean;
  readonly userId?: string;
  readonly providers?: string[];
  readonly fallbackProviderModelPair?: ProviderModelPair;
  readonly analysisTarget?: string;
  readonly error?: string;
}
