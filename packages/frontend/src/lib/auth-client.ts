import { createAuthClient } from "better-auth/react";
import { apiKeyClient } from "better-auth/client/plugins";

if (!process.env.NEXT_PUBLIC_BETTERAUTH_BASE_URL)
  throw new Error(
    "NEXT_PUBLIC_BETTERAUTH_BASE_URL environment variable is not set. Please set it to the backend URL (e.g. http://localhost:8000) before running the frontend.",
  );

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTERAUTH_BASE_URL,
  plugins: [apiKeyClient()],
});
