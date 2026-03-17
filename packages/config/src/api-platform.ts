import { Config, Context, Data, Effect, Layer } from "effect";

export class ApiPlatformConfigError extends Data.TaggedError("ApiPlatformConfigError")<{
  cause?: unknown;
  message?: string;
}> {}

interface ApiPlatformConfigImpl {
  readonly logLevel: string;
  readonly port: number;
  readonly pgConnection: string;
  readonly backendUrl: string;
}

export class ApiPlatformConfig extends Context.Tag("ApiPlatformConfig")<
  ApiPlatformConfig,
  ApiPlatformConfigImpl
>() {}

const apiPlatformConfigSchema = Config.all({
  logLevel: Config.string("API_PLATFORM_LOG_LEVEL").pipe(Config.withDefault("INFO")),
  port: Config.integer("API_PLATFORM_PORT").pipe(Config.withDefault(8080)),
  pgConnection: Config.string("API_PLATFORM_PG_URL"),
  backendUrl: Config.string("API_PLATFORM_BACKEND_URL").pipe(
    Config.withDefault("http://localhost:8000"),
  ),
});

export const ApiPlatformConfigLive = Layer.effect(
  ApiPlatformConfig,
  Effect.gen(function* () {
    const config = yield* apiPlatformConfigSchema;
    return ApiPlatformConfig.of(config);
  }).pipe(Effect.mapError((err) => new ApiPlatformConfigError({ cause: err, message: String(err) }))),
);
