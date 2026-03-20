import { Config, Context, Effect, Layer } from "effect";
import type { Option } from "effect";

interface VaultConfigImpl {
  readonly endpoint: string;
  readonly token: string;
  readonly tokenKey: Option.Option<string>;
  readonly logLevel: string;
  readonly logFile: string;
}

export class VaultConfig extends Context.Tag("VaultConfig")<
  VaultConfig,
  VaultConfigImpl
>() {}

export const VaultConfigLive = Layer.effect(
  VaultConfig,
  Effect.gen(function* () {
    const endpoint = yield* Config.string("VAULT_ADDR").pipe(
      Config.withDefault("http://127.0.0.1:8200"),
    );
    const token = yield* Config.string("VAULT_TOKEN");
    const tokenKey = yield* Config.option(Config.string("VAULT_TOKEN_KEY"));
    const logLevel = yield* Config.string("VAULT_LOG_LEVEL").pipe(Config.withDefault("Info"));
    const logFile = yield* Config.string("VAULT_LOG_FILE").pipe(Config.withDefault("vault.log"));

    yield* Effect.logInfo("VaultConfig loaded").pipe(
      Effect.annotateLogs({ service: "VaultConfig", endpoint, token: "***" }),
    );

    return VaultConfig.of({ endpoint, token, tokenKey, logLevel, logFile });
  }),
);
