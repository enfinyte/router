import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.POSTGRES_CONNECTION_STRING as string,
  }),
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
});
