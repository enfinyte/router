import { parse } from "./parse";
import { resolve as resolveFn } from "./resolver";
import type { ResponseCreateParams } from "./types";

import { runFetch } from "./models";
import { Effect } from "effect";

export const resolve = (options: ResponseCreateParams) =>
  Effect.gen(function* () {
    yield* runFetch;
    return resolveFn(options, parse);
  });
