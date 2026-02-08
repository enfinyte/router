import { Config } from "effect";

export const appConfig = Config.all({
  port: Config.integer("PORT").pipe(Config.withDefault(8000)),
  corsOrigin: Config.string("CORS_ORIGIN").pipe(Config.withDefault("http://localhost:3000")),
  baseUrl: Config.string("BETTER_AUTH_BASE_URL").pipe(Config.withDefault("http://localhost:8000")),
  postgresConnectionString: Config.string("POSTGRES_CONNECTION_STRING"),
  githubClientId: Config.string("GITHUB_CLIENT_ID"),
  githubClientSecret: Config.string("GITHUB_CLIENT_SECRET"),
});

export type AppConfig = Config.Config.Success<typeof appConfig>;
