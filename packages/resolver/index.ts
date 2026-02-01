import { Effect } from "effect";
import { parseModelImpl } from "./parse";
import { runModelFetch } from "./models";
import { resolveImpl } from "./resolver";
import { intentImpl, isIntent } from "./intent";
import type { ResponseCreateParams } from "./types";

export const resolve = (options: ResponseCreateParams) =>
  Effect.gen(function* () {
    yield* runModelFetch;
    return resolveImpl({ options, parseModelImpl, isIntent, intentImpl });
  });
