import { Hono } from "hono";
import { auth } from "./auth";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { trimTrailingSlash } from "hono/trailing-slash";
import { secretRoute } from "./secret";
import { apikeyRoute } from "./apikey";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

app.use(trimTrailingSlash());
app.use(logger());
app.use(
  "/api/auth/*",
  cors({
    // TODO: remember to change these later
    origin: "http://localhost:3000",
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
    origin: "*", // Allow any origin for API key verification
    allowHeaders: ["Content-Type"],
    allowMethods: ["POST", "OPTIONS"],
    maxAge: 600,
  }),
);

app.use(
  "/v1/*",
  cors({
    // TODO: remember to change these later
    origin: "http://localhost:3000",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  }),
);

app.use("v1/*", async (c, next) => {
  // Skip session auth for the API key verify endpoint
  if (c.req.path === "/v1/apikey/verify") {
    return next();
  }

  const session = await auth.api.getSession({ headers: c.req.raw.headers });
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
  port: 8000,
  fetch: app.fetch,
};
