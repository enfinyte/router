import { HttpRouter } from "@effect/platform";
import { responsesRouter } from "./responses";

export const v1Router = HttpRouter.empty.pipe(HttpRouter.mount("/responses", responsesRouter));
