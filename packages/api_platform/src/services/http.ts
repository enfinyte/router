import { Config, Context, Data, Effect, Layer } from "effect";
import Elysia from "elysia";

export class HTTPServerError extends Data.TaggedError("HTTPServerError")<{}> {}

interface HTTPServerImpl {}

export class HTTPServer extends Context.Tag("HTTPServer")<Elysia, HTTPServerImpl>() {}

export const make = (port: string | number | Partial<Bun.Serve.Options<unknown, string>>) =>
  Effect.gen(function* () {
    yield* Effect.log("Attempting to start HTTP server...");
    const app = new Elysia()
      .post("/v1/responses", () => "POST responses")
      .get("/v1/responses/:id", () => "GET responses/:id");

    return yield* Effect.acquireRelease(
      Effect.gen(function* () {
        yield* Effect.log(`Started a HTTP server at ${port}`);
        return app.listen(port);
      }),
      (server) => Effect.sync(() => server.stop()),
    );
  });

export const layer = (port: Parameters<typeof make>[0]) => Layer.scoped(HTTPServer, make(port));

export const fromEnv = Layer.scoped(
  HTTPServer,
  Effect.gen(function* () {
    const port = yield* Config.string("API_PLATFORM_HTTP_SERVER_PORT");
    return yield* make(port);
  }),
);
