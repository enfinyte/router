import { Config, Context, Effect, Layer } from "effect";

interface AppConfigImpl {
  readonly port: number;
  readonly corsOrigin: string;
  readonly baseUrl: string;
  readonly postgresConnectionString: string;
  readonly githubClientId: string;
  readonly githubClientSecret: string;
}

export class AppConfig extends Context.Tag("AppConfig")<AppConfig, AppConfigImpl>() {}

export const AppConfigLive = Layer.effect(
  AppConfig,
  Effect.gen(function* () {
    const port = yield* Config.integer("PORT").pipe(Config.withDefault(8000));
    const corsOrigin = yield* Config.string("CORS_ORIGIN").pipe(
      Config.withDefault("http://localhost:3000"),
    );
    const baseUrl = yield* Config.string("BETTER_AUTH_BASE_URL").pipe(
      Config.withDefault("http://localhost:8000"),
    );
    const postgresConnectionString = yield* Config.string("POSTGRES_CONNECTION_STRING");
    const githubClientId = yield* Config.string("GITHUB_CLIENT_ID");
    const githubClientSecret = yield* Config.string("GITHUB_CLIENT_SECRET");

    return AppConfig.of({
      port,
      corsOrigin,
      baseUrl,
      postgresConnectionString,
      githubClientId,
      githubClientSecret,
    });
  }),
);
