import { Context, Effect, Layer } from "effect";
import { VaultService, VaultServiceLive } from "vault";

import { DatabaseServiceError } from "../database/client";
import { SecretRepository, SecretRepositoryLive } from "../database/repositories/secret";
import { ProviderNotConfiguredError } from "../errors";

interface ProviderInfo {
  readonly fields: string[];
  readonly enabled: boolean;
}

export type ProviderMap = Record<string, ProviderInfo>;

type VaultServiceShape = Context.Tag.Service<typeof VaultService>;
type VaultErrors = Effect.Effect.Error<ReturnType<VaultServiceShape["addSecret"]>>;

interface SecretServiceImpl {
  listProviders: (userId: string) => Effect.Effect<ProviderMap, DatabaseServiceError>;

  addSecret: (
    userId: string,
    provider: string,
    keys: Record<string, string>,
  ) => Effect.Effect<void, DatabaseServiceError | VaultErrors>;

  toggleProvider: (
    userId: string,
    provider: string,
    enabled: boolean,
  ) => Effect.Effect<void, DatabaseServiceError | ProviderNotConfiguredError>;

  deleteProvider: (
    userId: string,
    provider: string,
  ) => Effect.Effect<void, DatabaseServiceError | VaultErrors>;
}

export class SecretService extends Context.Tag("SecretService")<
  SecretService,
  SecretServiceImpl
>() {}

export const SecretServiceLive = Layer.effect(
  SecretService,
  Effect.gen(function* () {
    const vault = yield* VaultService;
    const repo = yield* SecretRepository;

    return SecretService.of({
      listProviders: (userId) =>
        Effect.gen(function* () {
          const { providers, disabledProviders } = yield* repo.getUserSecrets(userId);

          const entries = yield* Effect.forEach(
            providers,
            (provider) =>
              vault.getSecret(userId, provider).pipe(
                Effect.map(
                  (keys) =>
                    [
                      provider,
                      {
                        fields: Object.keys(keys).filter(
                          (k) => typeof keys[k] === "string" && keys[k].length > 0,
                        ),
                        enabled: !disabledProviders.includes(provider),
                      },
                    ] as const,
                ),
                Effect.catchAll(() =>
                  Effect.succeed([
                    provider,
                    {
                      fields: [] as string[],
                      enabled: !disabledProviders.includes(provider),
                    },
                  ] as const),
                ),
              ),
            { concurrency: "unbounded" },
          );

          return Object.fromEntries(entries);
        }),

      addSecret: (userId, provider, keys) =>
        Effect.gen(function* () {
          const existing = yield* vault
            .getSecret(userId, provider)
            .pipe(Effect.catchAll(() => Effect.succeed({} as Record<string, string>)));

          const merged = { ...existing, ...keys };

          yield* vault.addSecret(userId, provider, merged);
          yield* repo.upsertProvider(userId, provider);
        }),

      toggleProvider: (userId, provider, enabled) =>
        Effect.gen(function* () {
          const { providers } = yield* repo.getUserSecrets(userId);
          if (!providers.includes(provider)) {
            return yield* new ProviderNotConfiguredError({ provider });
          }

          if (enabled) {
            yield* repo.enableProvider(userId, provider);
          } else {
            yield* repo.disableProvider(userId, provider);
          }
        }),

      deleteProvider: (userId, provider) =>
        Effect.gen(function* () {
          yield* vault.deleteSecret(userId, provider);
          yield* repo.removeProvider(userId, provider);
        }),
    });
  }),
).pipe(Layer.provide(VaultServiceLive), Layer.provide(SecretRepositoryLive));
