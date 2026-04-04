import { Clock, Effect } from "effect";

import { Redis } from ".";
import { TTL, REDIS_PREFIX } from "./consts";

export const getLastFetchPoint = () =>
  Effect.gen(function* () {
    const redis = yield* Redis;
    const lastFetchPoint = yield* redis.use((client) => client.get(REDIS_PREFIX.lastFetchPoint));
    return lastFetchPoint === null ? lastFetchPoint : parseInt(lastFetchPoint);
  });

export const markLastFetchPoint = () =>
  Effect.gen(function* () {
    const redis = yield* Redis;
    const now = yield* Clock.currentTimeMillis;
    yield* redis.use((client) => client.set(REDIS_PREFIX.lastFetchPoint, now.toString(), "PX", TTL));
  });
