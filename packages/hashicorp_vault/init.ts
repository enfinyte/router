import Vault from "node-vault";
import { Effect } from "effect";

Effect.gen(function* () {
  const vault = Vault();

  const initialized = yield* Effect.tryPromise(() => vault.initialized());
  console.log("Initialized:", initialized);

  if (!initialized.initialized) {
    const initResult = yield* Effect.tryPromise(() =>
      vault.init({ secret_shares: 1, secret_threshold: 1 }),
    );
    console.log("Init result:", initResult);
    vault.token = initResult.root_token;
    const key = initResult.keys[0];
    const unsealResult = yield* Effect.tryPromise(() => vault.unseal({ secret_shares: 1, key }));
    console.log("Unseal result:", unsealResult);
  } else {
    console.log("Vault already initialized");
  }
})
  .pipe(Effect.runPromise)
  .catch((err) => {
    console.error(err);
  });
