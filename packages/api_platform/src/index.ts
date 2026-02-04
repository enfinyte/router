import { HttpMiddleware, HttpServer } from "@effect/platform";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { Effect, flow, Layer } from "effect";
import { router } from "./routes/index";
import { AppConfig, AppConfigLive } from "./services/config";
import { DatabaseServiceLive } from "./services/database/";

export const app = router.pipe(
  HttpServer.serve(
    flow(HttpMiddleware.logger, HttpMiddleware.cors(), HttpMiddleware.xForwardedHeaders),
  ),
  HttpServer.withLogAddress,
);

const DatabaseLayer = DatabaseServiceLive.pipe(Layer.provide(AppConfigLive));

const HttpServerLayer = Layer.unwrapEffect(
  Effect.gen(function* () {
    const config = yield* AppConfig;
    return BunHttpServer.layer({ port: config.port });
  }),
).pipe(Layer.provide(AppConfigLive));

const AllServices = Layer.mergeAll(DatabaseLayer, AppConfigLive);
const AllServicesAndHttpServer = Layer.mergeAll(AllServices, HttpServerLayer);

BunRuntime.runMain(Layer.launch(Layer.provide(app, AllServicesAndHttpServer)));
