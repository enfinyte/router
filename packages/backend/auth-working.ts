import { betterAuth } from "better-auth";
import { apiKey } from "better-auth/plugins";
import { Pool } from "pg";

export const auth = betterAuth({
  baseURL: "http://localhost:8000",
  database: new Pool({
    connectionString: "postgresql://postgres:postgres@localhost:5432/postgres",
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: ["http://localhost:3000", "http://localhost:8000"],
  socialProviders: {
    github: {
      clientId: "Ov23lizz8LgircFe8QiH",
      clientSecret: "a75c6a207784f202bf757e2897765f75668286c2",
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
        defaultExpiresIn: null,
      },
    }),
  ],
});
