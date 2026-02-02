import { HttpMiddleware, HttpServer } from "@effect/platform";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { flow, Layer } from "effect";
import { router } from "./routes/index";
import { ResponseServiceLive } from "./services/responses/";
import { AIServiceLive } from "./services/ai/";
import { DatabaseServiceLive } from "./services/database/";

export const app = router.pipe(
  HttpServer.serve(
    flow(HttpMiddleware.logger, HttpMiddleware.cors(), HttpMiddleware.xForwardedHeaders),
  ),
  HttpServer.withLogAddress,
);

const ResponseLayer = ResponseServiceLive.pipe(
  Layer.provide(Layer.mergeAll(AIServiceLive, DatabaseServiceLive)),
);
const AllServices = Layer.mergeAll(ResponseLayer);
const AllServicesAndHttpServer = Layer.mergeAll(AllServices, BunHttpServer.layer({ port: 8080 }));

BunRuntime.runMain(Layer.launch(Layer.provide(app, AllServicesAndHttpServer)));
