import { ResolvedResponseSchema, type ResolvedResponse } from "common";
import { createHash } from "crypto";
import { hoursToMilliseconds } from "date-fns";
import { Effect, Schema } from "effect";

import { Redis } from "./index";
import { REDIS_PREFIX } from "./consts";

const MAX_ENTRIES_PER_USER = 100;
const TTL_MS = hoursToMilliseconds(1);

const resolvedResponseSchema = Schema.parseJson(Schema.Array(ResolvedResponseSchema));

export const getResolvedResponse = (userId: string, systemPromptText: string) =>
  Effect.gen(function* () {
    const redis = yield* Redis;

    const hashedSystemPromptText = hashText(systemPromptText);
    const entryKey = buildEntryKey(userId, hashedSystemPromptText);

    const raw = yield* redis.use((client) => client.get(entryKey));
    if (!raw) {
      yield* redis.use((client) => client.zrem(buildIndexKey(userId), hashedSystemPromptText));
      return undefined;
    }

    return yield* Schema.decodeUnknown(resolvedResponseSchema)(raw);
  });

export const setResolvedResponse = (
  userId: string,
  systemPromptText: string,
  result: ResolvedResponse[],
) =>
  Effect.gen(function* () {
    const redis = yield* Redis;

    const resultStr = yield* Schema.encode(resolvedResponseSchema)(result);
    const hashedSystemPromptText = hashText(systemPromptText);
    const entryKey = buildEntryKey(userId, hashedSystemPromptText);
    const indexKey = buildIndexKey(userId);

    const now = yield* Effect.succeed(Date.now());
    // NOTE: zcard + zrange is not atomic, so concurrent requests may over-evict by 1.
    // This is acceptable — the cache is opportunistic and entries have their own TTL.
    const currentSize = yield* redis.use((client) => client.zcard(indexKey));

    if (currentSize >= MAX_ENTRIES_PER_USER) {
      const excess = currentSize - MAX_ENTRIES_PER_USER + 1;
      const excessEntries = yield* redis.use((client) => client.zrange(indexKey, 0, excess - 1));

      if (excessEntries.length > 0) {
        yield* Effect.all(
          [
            ...excessEntries.map((hash) =>
              redis.use((client) => client.del(buildEntryKey(userId, hash))),
            ),
            ...excessEntries.map((hash) => redis.use((client) => client.zrem(indexKey, hash))),
          ],
          { concurrency: "unbounded" },
        );
      }
    }

    yield* Effect.all(
      [
        redis.use((client) => client.set(entryKey, resultStr, "PX", TTL_MS)),
        redis.use((client) => client.zadd(indexKey, now, hashedSystemPromptText)),
        redis.use((client) => client.pexpire(indexKey, TTL_MS)),
      ],
      { concurrency: "unbounded" },
    );
  });

const hashText = (text: string): string => {
  return createHash("sha256").update(text).digest("hex");
};

const buildEntryKey = (userId: string, hashedString: string): string => {
  return `${REDIS_PREFIX.classificationCache}:${userId}:${hashedString}`;
};

const buildIndexKey = (userId: string): string => {
  return `${REDIS_PREFIX.classificationCache}:${userId}:index`;
};
