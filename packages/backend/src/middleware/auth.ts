import { Effect, Schema } from "effect";
import type { Context as HonoContext, Next } from "hono";

import type { AuthInstance } from "../services/auth";
import { RequestValidationError, UnauthorizedError } from "../errors";

export interface AuthenticatedUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly image: string | null;
}

export const getAuthenticatedUser = (c: HonoContext) => {
  const user = c.get("user") as AuthenticatedUser | null | undefined;
  if (!user) {
    return Effect.fail(new UnauthorizedError({ message: "Unauthorized" }));
  }
  return Effect.succeed(user);
};

export const parseBody = <A, I>(c: HonoContext, schema: Schema.Schema<A, I>) =>
  Effect.tryPromise({
    try: () => c.req.json() as Promise<unknown>,
    catch: (error) => new RequestValidationError({ cause: error, message: "Invalid JSON body" }),
  }).pipe(
    Effect.flatMap((raw) =>
      Schema.decodeUnknown(schema)(raw).pipe(
        Effect.mapError(
          (cause) => new RequestValidationError({ cause, message: "Request validation failed" }),
        ),
      ),
    ),
  );

export const createAuthMiddleware = (auth: AuthInstance) => async (c: HonoContext, next: Next) => {
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
};
