import { Config, Context, Effect, Layer } from "effect";

interface BackendConfigImpl {
  readonly port: number;
  readonly corsOrigin: string;
  readonly baseUrl: string;
  readonly postgresConnectionString: string;
  readonly githubClientId: string;
  readonly githubClientSecret: string;
}

export class BackendConfig extends Context.Tag("BackendConfig")<
  BackendConfig,
  BackendConfigImpl
>() {}

export const BackendConfigLive = Layer.effect(
  BackendConfig,
  Effect.gen(function* () {
    const port = yield* Config.integer("BACKEND_PORT").pipe(Config.withDefault(8000));
    const corsOrigin = yield* Config.string("BACKEND_CORS_ORIGIN").pipe(
      Config.withDefault("http://localhost:3000"),
    );
    const baseUrl = yield* Config.string("BACKEND_AUTH_BASE_URL").pipe(
      Config.withDefault("http://localhost:8000"),
    );
    const postgresConnectionString = yield* Config.string("BACKEND_PG_URL");
    const githubClientId = yield* Config.string("BACKEND_GITHUB_CLIENT_ID");
    const githubClientSecret = yield* Config.string("BACKEND_GITHUB_CLIENT_SECRET");

    return BackendConfig.of({
      port,
      corsOrigin,
      baseUrl,
      postgresConnectionString,
      githubClientId,
      githubClientSecret,
    });
  }),
);
