import { Config, Data, Effect, Logger, LogLevel } from "effect";
import Vault from "node-vault";

class VaultInitError extends Data.TaggedError("VaultInitError")<{
  cause?: unknown;
  message?: string;
}> {}

const program = Effect.gen(function* () {
  const vault = Vault();

  const { initialized } = yield* Effect.tryPromise({
    try: () => vault.initialized(),
    catch: (error) =>
      new VaultInitError({ cause: error, message: "Failed to check initialization status" }),
  });

  if (!initialized) {
    const initResult = yield* Effect.tryPromise({
      try: () => vault.init({ secret_shares: 1, secret_threshold: 1 }),
      catch: (error) => new VaultInitError({ cause: error, message: "Failed to initialize Vault" }),
    });

    yield* Effect.log("Vault initialized successfully");

    vault.token = initResult.root_token;
    const key: string | undefined = initResult.keys[0];

    if (!key) {
      return yield* new VaultInitError({ message: "No unseal key returned from Vault init" });
    }

    yield* Effect.tryPromise({
      try: () => vault.unseal({ secret_shares: 1, key }),
      catch: (error) => new VaultInitError({ cause: error, message: "Failed to unseal Vault" }),
    });
    yield* Effect.log("Vault unsealed");

    yield* Effect.tryPromise({
      try: () => vault.mount({ mount_point: "secret", type: "kv", options: { version: "2" } }),
      catch: (error) =>
        new VaultInitError({ cause: error, message: "Failed to enable KV v2 secrets engine" }),
    });
    yield* Effect.log("Enabled KV v2 secrets engine at secret/");
  } else {
    yield* Effect.log("Vault already initialized");

    const status = yield* Effect.tryPromise({
      try: () => vault.status(),
      catch: (error) =>
        new VaultInitError({ cause: error, message: "Failed to check Vault status" }),
    });

    if (status.sealed) {
      yield* Effect.log("Vault is sealed, attempting to unseal...");

      const unsealKey = yield* Config.string("VAULT_TOKEN_KEY").pipe(
        Effect.mapError(
          (error) =>
            new VaultInitError({
              cause: error,
              message: "VAULT_TOKEN_KEY environment variable is required to unseal Vault",
            }),
        ),
      );

      yield* Effect.tryPromise({
        try: () => vault.unseal({ secret_shares: 1, key: unsealKey }),
        catch: (error) => new VaultInitError({ cause: error, message: "Failed to unseal Vault" }),
      });
      yield* Effect.log("Vault unsealed");
    } else {
      yield* Effect.log("Vault is already unsealed");
    }
  }
});

program.pipe(
  Effect.catchTag("VaultInitError", (err) => Effect.logError(`Vault init failed: ${err.message}`)),
  Logger.withMinimumLogLevel(LogLevel.All),
  Effect.runPromise,
);
