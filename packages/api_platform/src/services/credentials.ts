import { Effect, Data } from "effect";
import { VaultService } from "@enfinyte/services";
import { type ProviderCredentials, Providers } from "common";
import { getProviderEntry } from "./provider-registry";

export class CredentialsError extends Data.TaggedError("CredentialsError")<{
  cause?: unknown;
  message?: string;
}> {}

export const getCredentials = <T extends Providers>(
  userId: string,
  provider: T,
): Effect.Effect<ProviderCredentials<T>, CredentialsError, VaultService> =>
  Effect.gen(function* () {
    const vault = yield* VaultService;
    const secrets = yield* vault.getSecret(userId, provider).pipe(
      Effect.mapError(
        (error) =>
          new CredentialsError({
            cause: error,
            message: `Failed to retrieve credentials for provider "${provider}"`,
          }),
      ),
    );

    return getProviderEntry(provider).extractCredentials(secrets);
  });
