import { Effect } from "effect";
import { runDataFetch, DATA_PATH } from "./data_manager";
import { resolveImpl } from "./resolver";
import type { ResolvedResponse, CreateResponseBody } from "common";

export const resolve = (
  options: CreateResponseBody,
  userProviders: string[],
  excludedResponses: ResolvedResponse[] = [],
) =>
  Effect.gen(function* () {
    yield* runDataFetch(DATA_PATH);
    return yield* resolveImpl(options, userProviders, excludedResponses);
  });
