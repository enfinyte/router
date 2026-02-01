import { HttpRouter, HttpServerResponse } from "@effect/platform";
import { v1Router } from "./v1/";
import { withAuthorizationValidation } from "../middlewares";
import { Effect } from "effect";

export const router = HttpRouter.empty
  .pipe(
    HttpRouter.mount("/v1", v1Router),
    HttpRouter.use(withAuthorizationValidation()),
    HttpRouter.get("/health", HttpServerResponse.empty()),
  )
  .pipe(
    Effect.catchTags({
      Unauthorized: () =>
        HttpServerResponse.text("Invalid or missing authorization", { status: 401 }),
      BadRequest: () => HttpServerResponse.text("Bad request", { status: 400 }),
    }),
  );
