import { Config, Context, Data, Effect, Layer } from "effect";

export class AppConfigError extends Data.TaggedError("AppConfigError")<{
  cause?: unknown;
  message?: string;
}> {}

interface AppConfigImpl {
  readonly logLevel: string;
  readonly port: number;
  readonly pgConnection: string;
  readonly backendUrl: string;
}

export class AppConfig extends Context.Tag("AppConfig")<AppConfig, AppConfigImpl>() {}

const appConfigSchema = Config.all({
  logLevel: Config.string("API_PLATFORM_LOG_LEVEL").pipe(Config.withDefault("INFO")),
  port: Config.integer("API_PLATFORM_PORT").pipe(Config.withDefault(8080)),
  pgConnection: Config.string("API_PLATFORM_PG_CONNECTION"),
  backendUrl: Config.string("API_PLATFORM_BACKEND_URL").pipe(
    Config.withDefault("http://localhost:8000"),
  ),
});

export const AppConfigLive = Layer.effect(
  AppConfig,
  Effect.gen(function* () {
    const config = yield* appConfigSchema;
    return AppConfig.of(config);
  }).pipe(Effect.mapError((err) => new AppConfigError({ cause: err, message: String(err) }))),
);
