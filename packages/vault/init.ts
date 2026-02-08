import Vault from "node-vault";
import { Effect } from "effect";

Effect.gen(function* () {
  const vault = Vault();

  const initialized = yield* Effect.tryPromise(() => vault.initialized());

  if (!initialized.initialized) {
    const initResult = yield* Effect.tryPromise(() =>
      vault.init({ secret_shares: 1, secret_threshold: 1 }),
    );
    console.log("Init result:", initResult);

    vault.token = initResult.root_token;
    const key = initResult.keys[0];
    yield* Effect.tryPromise(() => vault.unseal({ secret_shares: 1, key }));
    console.log("Vault unsealed.");

    yield* Effect.tryPromise(() =>
      vault.mount({ mount_point: "secret", type: "kv", options: { version: "2" } }),
    );
    console.log("Enabled KV v2 secrets engine at secret/");
  } else {
    console.log("Vault already initialized");

    const status = yield* Effect.tryPromise(() => vault.status());
    if (status.sealed) {
      console.log("Vault is sealed, attempting to unseal...");
      yield* Effect.tryPromise(() =>
        vault.unseal({ secret_shares: 1, key: process.env.VAULT_TOKEN_KEY }),
      );
      console.log("Vault unsealed");
    } else {
      console.log("Vault is already unsealed");
    }
  }
})
  .pipe(Effect.runPromise)
  .catch((err) => {
    console.error(err);
  });
