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

    yield* Effect.logDebug("Creating VaultClient").pipe(
      Effect.annotateLogs({ service: "VaultClient", endpoint, token: "***" }),
    );

    const client = Vault({
      endpoint,
      token,
    });

    yield* Effect.logInfo("VaultClient initialized").pipe(
      Effect.annotateLogs({ service: "VaultClient", endpoint }),
    );

    return client;
  }),
).pipe(Layer.provide(VaultConfigLive));
