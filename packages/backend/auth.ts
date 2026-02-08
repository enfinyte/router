import { pool } from "./pool";
import { betterAuth } from "better-auth";
import { apiKey } from "better-auth/plugins";

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
  },
  // TODO: remember to change these later
  trustedOrigins: ["http://localhost:3000", "http://localhost:8000"],
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
  },
  plugins: [
    apiKey({
      defaultPrefix: "ef_",
      keyExpiration: {
        defaultExpiresIn: null, // Keys don't expire unless explicitly set
      },
    }),
  ],
});
