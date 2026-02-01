import { HttpRouter, HttpServerResponse } from "@effect/platform";
import { v1Router } from "./v1/";

export const router = HttpRouter.empty.pipe(
  HttpRouter.get("/health", HttpServerResponse.empty()),
  HttpRouter.mount("/v1", v1Router),
);
