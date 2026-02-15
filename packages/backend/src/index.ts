import { Effect } from "effect";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { trimTrailingSlash } from "hono/trailing-slash";

import { AppConfig } from "./config";
import { AuthService } from "./services/auth";
import { createAuthMiddleware } from "./middleware/auth";
import { analyticsRoute } from "./routes/analytics";
import { apikeyRoute } from "./routes/apikey";
import { secretRoute } from "./routes/secret";
import { appRuntime } from "./runtime";

const { auth, config } = await appRuntime.runPromise(
  Effect.gen(function* () {
    const authInstance = yield* AuthService;
    const cfg = yield* AppConfig;
    return { auth: authInstance, config: cfg };
  }),
);

const app = new Hono<{
  Variables: {
    user: Record<string, unknown> | null;
    session: Record<string, unknown> | null;
  };
}>();
app.use(trimTrailingSlash());
app.use(logger());
app.use(secureHeaders());

app.use(
  "/api/auth/*",
  cors({
    origin: config.corsOrigin,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);
app.use(
  "/v1/apikey/verify",
  cors({
    origin: config.corsOrigin,
    allowHeaders: ["Content-Type"],
    allowMethods: ["POST", "OPTIONS"],
    maxAge: 600,
  }),
);
app.use(
  "/v1/*",
  cors({
    origin: config.corsOrigin,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);
app.use("/v1/*", createAuthMiddleware(auth));

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

app.route("v1", secretRoute);
app.route("v1", apikeyRoute);
app.route("v1", analyticsRoute);

export default {
  port: config.port,
  fetch: app.fetch,
};
