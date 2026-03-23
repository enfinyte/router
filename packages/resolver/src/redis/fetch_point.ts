import { Clock, Effect } from "effect";

import { Redis } from ".";
import { TTL } from "./consts";

const LAST_FETCH_POINT_KEY = "enfinyte:lastFetchPoint";

export const getLastFetchPoint = () =>
  Effect.gen(function* () {
    const redis = yield* Redis;
    const lastFetchPoint = yield* redis.use((client) => client.get(LAST_FETCH_POINT_KEY));
    return lastFetchPoint === null ? lastFetchPoint : parseInt(lastFetchPoint);
  });

export const markLastFetchPoint = () =>
  Effect.gen(function* () {
    const redis = yield* Redis;
    const now = yield* Clock.currentTimeMillis;
    yield* redis.use((client) => client.set(LAST_FETCH_POINT_KEY, now.toString(), "PX", TTL));
  });
