import Vault from "node-vault";
import { VaultConfig, VaultConfigLive } from "./config";
import { Context, Effect, Layer } from "effect";

export class VaultClient extends Context.Tag("VaultClient")<
  VaultClient,
  ReturnType<typeof Vault>
>() {}

export const VaultClientLive = Layer.effect(
  VaultClient,
  Effect.gen(function* () {
    const { endpoint, token } = yield* VaultConfig;
    return Vault({
      endpoint,
      token,
    });
  }),
).pipe(Layer.provide(VaultConfigLive));
