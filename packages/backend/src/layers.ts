import { Layer } from "effect";
import { fromEnv as LedgerServiceLive } from "ledger";
import { AppConfig, AppConfigLive } from "./config";
import { DatabasePoolLive } from "./database/pool";
import { DatabaseServiceLive } from "./database/client";
import { SecretRepositoryLive } from "./database/repositories/secret";
import { AuthServiceLive } from "./services/auth";
import { ApiKeyServiceLive } from "./services/apikey";
import { SecretServiceLive } from "./services/secret";

const AppConfigExposed = Layer.effect(AppConfig, AppConfig).pipe(Layer.provide(AppConfigLive));

export const AppLive = Layer.mergeAll(
  ApiKeyServiceLive,
  SecretServiceLive,
  AuthServiceLive,
  LedgerServiceLive,
).pipe(
  Layer.provideMerge(AppConfigExposed),
  Layer.provide(SecretRepositoryLive),
  Layer.provide(DatabaseServiceLive),
  Layer.provide(DatabasePoolLive),
  Layer.provide(AppConfigLive),
);
