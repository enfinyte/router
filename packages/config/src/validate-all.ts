import { Config, Effect } from "effect";
import type { ConfigError } from "effect";

export type ServiceName = "api_platform" | "backend" | "vault" | "resolver" | "ledger";

const SERVICE_REQUIRED_VARS: Record<ServiceName, readonly string[]> = {
  api_platform: ["API_PLATFORM_PG_URL", "REDIS_URL"],
  backend: [
    "BACKEND_PG_URL",
    "BACKEND_GITHUB_CLIENT_ID",
    "BACKEND_GITHUB_CLIENT_SECRET",
    "BETTER_AUTH_SECRET",
    "REDIS_URL",
  ],
  vault: ["VAULT_TOKEN"],
  resolver: ["REDIS_URL"],
  ledger: ["LEDGER_PG_URL"],
};

const ALL_REQUIRED_VARS = [
  "API_PLATFORM_PG_URL",
  "BACKEND_PG_URL",
  "BACKEND_GITHUB_CLIENT_ID",
  "BACKEND_GITHUB_CLIENT_SECRET",
  "BETTER_AUTH_SECRET",
  "VAULT_TOKEN",
  "REDIS_URL",
  "LEDGER_PG_URL",
  "DATABASE_URL",
] as const;

export const validateStartup = (
  service: ServiceName,
): Effect.Effect<void, ConfigError.ConfigError> =>
  Effect.gen(function* () {
    yield* Config.all(
      SERVICE_REQUIRED_VARS[service].map((v) => Config.string(v)),
    );
  });

export const validateAllConfig: Effect.Effect<void, Error> = Effect.gen(function* () {
  const errors: string[] = [];

  for (const varName of ALL_REQUIRED_VARS) {
    yield* Effect.gen(function* () {
      yield* Config.string(varName);
    }).pipe(
      Effect.asVoid,
      Effect.catchAll((err) =>
        Effect.sync(() => {
          errors.push(`Missing: ${varName} (${String(err)})`);
        }),
      ),
    );
  }

  if (errors.length > 0) {
    return yield* Effect.fail(
      new Error(`Missing required environment variables:\n${errors.join("\n")}`),
    );
  }
});
