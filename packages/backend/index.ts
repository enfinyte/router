import { Effect } from "effect";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { trimTrailingSlash } from "hono/trailing-slash";

import { AuthService } from "./auth";
import { appConfig } from "./config";
import { AppLive } from "./layers";
import { apikeyRoute } from "./apikey";
import { secretRoute } from "./secret";
// import { rateLimiter } from "./rate-limit";

const { auth, config } = await Effect.gen(function* () {
  const authInstance = yield* AuthService;
  const cfg = yield* appConfig;
  return { auth: authInstance, config: cfg };
}).pipe(Effect.provide(AppLive), Effect.runPromise);

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

app.use("v1/*", async (c, next) => {
  // The verify endpoint is public (authenticated via API key in body)
  if (c.req.path === "/v1/apikey/verify") {
    return next();
  }

  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

app.route("v1", secretRoute);
app.route("v1", apikeyRoute);

export default {
  port: config.port,
  fetch: app.fetch,
};
