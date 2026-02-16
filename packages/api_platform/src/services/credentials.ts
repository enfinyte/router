import { Effect, Data } from "effect";
import { VaultService } from "vault";
import { type ProviderCredentials, Providers } from "common";

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

    switch (provider) {
      case Providers.AmazonBedrock:
        return {
          accessKeyId: secrets["accessKeyId"] ?? "",
          secretAccessKey: secrets["secretAccessKey"] ?? "",
          region: secrets["region"] ?? "",
        } satisfies ProviderCredentials<Providers.AmazonBedrock> as ProviderCredentials<T>;
      case Providers.OpenAI:
        return {
          apiKey: secrets["apiKey"] ?? "",
        } satisfies ProviderCredentials<Providers.OpenAI> as ProviderCredentials<T>;
      case Providers.Anthropic:
        return {
          apiKey: secrets["apiKey"] ?? "",
        } satisfies ProviderCredentials<Providers.Anthropic> as ProviderCredentials<T>;
      default: {
        const _exhaustiveCheck: never = provider satisfies never;
        return yield* Effect.fail(
          new CredentialsError({ message: `Unsupported provider: ${provider}` }),
        );
      }
    }
  });
