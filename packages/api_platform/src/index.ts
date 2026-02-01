import { HttpMiddleware, HttpServer } from "@effect/platform";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { flow, Layer } from "effect";
import { router } from "./routes/index";
import * as ResponsesService from "./services/responses";

export const app = router.pipe(
  HttpServer.serve(
    flow(HttpMiddleware.logger, HttpMiddleware.cors(), HttpMiddleware.xForwardedHeaders),
  ),
  HttpServer.withLogAddress,
);

const AllServices = Layer.mergeAll(ResponsesService.layer());
const AllServicesAndHttpServer = Layer.mergeAll(AllServices, BunHttpServer.layer({ port: 8080 }));

BunRuntime.runMain(Layer.launch(Layer.provide(app, AllServicesAndHttpServer)));
