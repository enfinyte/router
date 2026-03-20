import { hoursToMilliseconds } from "date-fns";
import { Effect, Schema } from "effect";
import { Redis } from ".";
import { createHash } from "crypto";
import { ResolvedResponseSchema, type ResolvedResponse } from "common";

const MAX_ENTRIES_PER_USER = 100;
const TTL_MS = hoursToMilliseconds(1);

const KEY_PREFIX = "classification_cache";

const resolvedResponseSchema = Schema.parseJson(ResolvedResponseSchema);

export const get = (userId: string, systemPromptText: string) =>
  Effect.gen(function* () {
    const redis = yield* Redis;

    const hashedSystemPromptText = hashText(systemPromptText);
    const entryKey = buildEntryKey(userId, hashedSystemPromptText);

    const raw = yield* redis.use((client) => client.get(entryKey));
    if (!raw) {
      yield* redis.use((client) => client.zRem(buildIndexKey(userId), hashedSystemPromptText));
      return undefined;
    }

    return yield* Schema.decodeUnknown(resolvedResponseSchema)(raw);
  });

export const set = (userId: string, systemPromptText: string, result: ResolvedResponse) =>
  Effect.gen(function* () {
    const redis = yield* Redis;

    const resultStr = yield* Schema.encode(resolvedResponseSchema)(result);
    const hashedSystemPromptText = hashText(systemPromptText);
    const entryKey = buildEntryKey(userId, hashedSystemPromptText);
    const indexKey = buildIndexKey(userId);

    const now = yield* Effect.succeed(Date.now());
    const currentSize = yield* redis.use((client) => client.zCard(indexKey));

    if (currentSize >= MAX_ENTRIES_PER_USER) {
      const excess = currentSize - MAX_ENTRIES_PER_USER + 1;
      const excessEntries = yield* redis.use((client) => client.zRange(indexKey, 0, excess - 1));

      if (excessEntries.length > 0) {
        yield* redis.use((client) => {
          const pipeline = client.multi();
          excessEntries.forEach((hash) => pipeline.del(buildEntryKey(userId, hash)));
          pipeline.zRem(indexKey, excessEntries);
          return pipeline.execAsPipeline();
        });
      }
    }

    yield* redis.use((client) => {
      const pipeline = client.multi();
      pipeline.set(entryKey, resultStr, { expiration: { type: "PX", value: TTL_MS } });
      pipeline.zAdd(indexKey, { score: now, value: hashedSystemPromptText });
      pipeline.pExpire(indexKey, TTL_MS);
      return pipeline.execAsPipeline();
    });
  });

const hashText = (text: string): string => {
  return createHash("sha256").update(text).digest("hex");
};

const buildEntryKey = (userId: string, hashedString: string): string => {
  return `${KEY_PREFIX}:${userId}:${hashedString}`;
};

const buildIndexKey = (userId: string): string => {
  return `${KEY_PREFIX}:${userId}:index`;
};
