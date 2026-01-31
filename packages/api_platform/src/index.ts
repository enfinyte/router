import { BunRuntime } from "@effect/platform-bun";
import { main } from "./main";
import * as HTTPServer from "./services/http";
import { Effect, Layer } from "effect";

const ALL_SERVICES = Layer.mergeAll(HTTPServer.fromEnv);

main.pipe(Effect.provide(ALL_SERVICES), BunRuntime.runMain);
