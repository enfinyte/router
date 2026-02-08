import { Effect } from "effect";
import type { IntentPair } from "../types";
import { DATA_PATH } from "./const";
import { FileSystem } from "@effect/platform/FileSystem";

export const getOpenRouterDataByPair = (pair: IntentPair) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem;
    return yield* fs.readFileString(`${DATA_PATH}/${pair.intent}/${pair.intentPolicy}.json`);
  });
