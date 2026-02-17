import { HttpMiddleware, HttpServerRequest } from "@effect/platform";
import { Data, Effect, Layer } from "effect";
import { BadRequest, Unauthorized } from "@effect/platform/HttpApiError";
import { AppConfig } from "./services/config";
import { RequestContext } from "./services/request-context";

export const withProperContentTypeValidation = () =>
  HttpMiddleware.make((app) =>
    Effect.gen(function* () {
      const { headers } = yield* HttpServerRequest.HttpServerRequest;

      const contentType = headers["content-type"]?.toLowerCase();
      if (contentType !== "application/json") return yield* Effect.fail(new BadRequest());

      return yield* app;
    }),
  );

class ApiKeyVerificationError extends Data.TaggedError("ApiKeyVerificationError")<{
  cause?: unknown;
  message?: string;
}> {}

interface VerifyResponse {
  valid: boolean;
  userId: string;
  providers?: string[];
  fallbackProviderModelPair?: string;
  analysisTarget?: string;
}

const verifyApiKey = (backendUrl: string, apiKey: string) =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(`${backendUrl}/v1/apikey/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: apiKey }),
      });
      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }
      return (await response.json()) as VerifyResponse;
    },
    catch: (error) =>
      new ApiKeyVerificationError({
        cause: error,
        message: `Failed to verify API key: ${error}`,
      }),
  });

export const withAuthorizationValidation = () =>
  HttpMiddleware.make((app) =>
    Effect.gen(function* () {
      const { headers } = yield* HttpServerRequest.HttpServerRequest;

      const authorization = headers["authorization"];
      if (!authorization) return yield* Effect.fail(new Unauthorized());

      const parts = authorization.split(" ");
      if (parts[0]?.toLowerCase() !== "bearer" || !parts[1])
        return yield* Effect.fail(new Unauthorized());

      const apiKey = parts[1];

      const config = yield* AppConfig;
      const verifyResult = yield* verifyApiKey(config.backendUrl, apiKey).pipe(
        Effect.catchTag("ApiKeyVerificationError", () => Effect.fail(new Unauthorized())),
      );

      if (!verifyResult.valid || !verifyResult.userId)
        return yield* Effect.fail(new Unauthorized());

      const userId = verifyResult.userId;
      const userProviders = verifyResult.providers ?? [];
      const fallbackProviderModelPair = verifyResult.fallbackProviderModelPair;
      const analysisTarget = verifyResult.analysisTarget;

      return yield* Effect.provide(
        app,
        Layer.succeed(
          RequestContext,
          RequestContext.of({ userId, userProviders, fallbackProviderModelPair, analysisTarget }),
        ),
      );
    }),
  );
