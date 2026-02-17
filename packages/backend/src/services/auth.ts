import pg from "pg";
import { Context, Effect, Layer } from "effect";
import { betterAuth } from "better-auth";
import { apiKey } from "better-auth/plugins";
import { AppConfig, AppConfigLive } from "../config";
import type { BetterAuthPlugin } from "better-auth";

const secret = (): BetterAuthPlugin => ({
  id: "secret",
  schema: {
    secrets: {
      modelName: "secret",
      fields: {
        userId: {
          type: "string",
          required: true,
          references: {
            model: "user",
            field: "id",
            onDelete: "cascade",
          },
          index: true,
        },
        providers: {
          type: "string[]",
          required: false,
        },
        disabledProviders: {
          type: "string[]",
          required: false,
        },
        createdAt: {
          type: "date",
          required: true,
          defaultValue: {
            value: "now",
          },
        },
        updatedAt: {
          type: "date",
          required: true,
          defaultValue: {
            value: "now",
          },
        },
      },
    },
  },
});

const createAuth = (
  pool: pg.Pool,
  config: {
    baseUrl: string;
    corsOrigin: string;
    githubClientId: string;
    githubClientSecret: string;
  },
) =>
  betterAuth({
    baseURL: config.baseUrl,
    database: pool,
    emailAndPassword: {
      enabled: true,
    },
    trustedOrigins: [config.corsOrigin, config.baseUrl],
    user: {
      additionalFields: {
        hasCompletedOnboarding: {
          type: "boolean",
          input: true,
          defaultValue: false,
        },
        fallbackProviderModelPair: {
          type: "string",
          input: true,
          required: false,
        },
      },
    },
    socialProviders: {
      github: {
        clientId: config.githubClientId,
        clientSecret: config.githubClientSecret,
      },
    },
    plugins: [
      apiKey({
        defaultPrefix: "ef_",
        rateLimit: {
          enabled: false,
        },
        keyExpiration: {
          maxExpiresIn: 60,
          minExpiresIn: 1,
          defaultExpiresIn: null,
        },
      }),
      secret(),
    ],
  });

export type AuthInstance = ReturnType<typeof createAuth>;

export class AuthService extends Context.Tag("AuthService")<AuthService, AuthInstance>() {}

export const AuthServiceLive = Layer.effect(
  AuthService,
  Effect.gen(function* () {
    const config = yield* AppConfig;

    const pool = new pg.Pool({ connectionString: config.postgresConnectionString });

    return createAuth(pool, {
      baseUrl: config.baseUrl,
      corsOrigin: config.corsOrigin,
      githubClientId: config.githubClientId,
      githubClientSecret: config.githubClientSecret,
    });
  }),
).pipe(Layer.provide(AppConfigLive));

// NOTE: Only used for generating
export const auth = Effect.runSync(Effect.provide(AuthService, AuthServiceLive));
