import { Config, Context, Effect, Layer } from "effect";

interface VaultConfigImpl {
  readonly endpoint: string;
  readonly token: string;
}

export class VaultConfig extends Context.Tag("VaultConfig")<VaultConfig, VaultConfigImpl>() {}

export const VaultConfigLive = Layer.effect(
  VaultConfig,
  Effect.gen(function* () {
    const endpoint = yield* Config.string("VAULT_ADDR").pipe(
      Config.withDefault("http://127.0.0.1:8200"),
    );
    const token = yield* Config.string("VAULT_TOKEN");
    return VaultConfig.of({
      endpoint,
      token,
    });
  }),
);
