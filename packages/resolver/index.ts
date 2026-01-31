import { parse } from "./parse";
import { resolve as resolveFn } from "./resolver";
import type { ResponseCreateParams } from "./types";

export const resolve = (options: ResponseCreateParams) => {
    return resolveFn(options, parse);
}
