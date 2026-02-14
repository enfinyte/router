import { Context, Effect, Layer } from "effect";
import { betterAuth } from "better-auth";
import { apiKey } from "better-auth/plugins";

import { appConfig } from "./config";
import { DatabasePool } from "./pool";

const createAuth = (
  pool: InstanceType<typeof import("pg").Pool>,
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
    ],
  });

export type AuthInstance = ReturnType<typeof createAuth>;

export class AuthService extends Context.Tag("AuthService")<AuthService, AuthInstance>() {}

export const AuthServiceLive = Layer.effect(
  AuthService,
  Effect.gen(function* () {
    const pool = yield* DatabasePool;
    const config = yield* appConfig;
    return createAuth(pool, {
      baseUrl: config.baseUrl,
      corsOrigin: config.corsOrigin,
      githubClientId: config.githubClientId,
      githubClientSecret: config.githubClientSecret,
    });
  }),
);
