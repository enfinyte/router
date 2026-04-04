import { Effect } from "effect";
import { Providers, SUPPORTED_PROVIDERS, type ProviderCredentials } from "common";
import type { ResolvedResponse } from "common";
import { AIServiceError } from ".";
import { getProviderEntry } from "../provider-registry";

export const buildLanguageModel = (
  resolved: ResolvedResponse,
  credentials: ProviderCredentials<Providers>,
) =>
  Effect.gen(function* () {
    const { provider, model } = resolved;

    if (!provider || !model || !SUPPORTED_PROVIDERS.includes(provider as Providers)) {
      return yield* Effect.fail(
        new AIServiceError({
          message: !provider ? "Empty provider resolved" : `Unsupported provider: ${provider}`,
        }),
      );
    }

    const entry = getProviderEntry(provider as Providers);
    return entry.createClient(credentials)(model);
  });
