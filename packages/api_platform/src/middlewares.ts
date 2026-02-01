import { HttpMiddleware, HttpServerRequest } from "@effect/platform";
import { Effect } from "effect";
import { BadRequest, Unauthorized } from "@effect/platform/HttpApiError";

export const withProperContentTypeValidation = () =>
  HttpMiddleware.make((app) =>
    Effect.gen(function* () {
      const { headers } = yield* HttpServerRequest.HttpServerRequest;

      const contentType = headers["content-type"]?.toLowerCase();
      if (contentType !== "application/json") return yield* Effect.fail(new BadRequest());

      return yield* app;
    }),
  );

export const withAuthorizationValidation = () =>
  HttpMiddleware.make((app) =>
    Effect.gen(function* () {
      const { headers } = yield* HttpServerRequest.HttpServerRequest;

      const authorization = headers["authorization"]?.toLowerCase();
      if (!authorization || authorization.split(" ")[0]?.toLowerCase() !== "bearer")
        return yield* Effect.fail(new Unauthorized());

      // TODO: talk with api services to validate the token
      return yield* app;
    }),
  );
