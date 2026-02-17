import type { ResolvedResponse } from "common";

const DEFAULT_MAX_ENTRIES_PER_USER = 100;
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  readonly result: ResolvedResponse;
  readonly createdAt: number;
}

/**
 * Per-user in-memory cache for system prompt classification results.
 *
 * Keyed by userId -> SHA-256 hash of system prompt text -> ResolvedResponse.
 * Used when analysisTarget is "per_system_prompt" to avoid re-classifying
 * the same system prompt on every request.
 *
 * Entries are evicted after TTL or when the per-user limit is reached (LRU-style).
 */
class ClassificationCache {
  private readonly cache = new Map<string, Map<string, CacheEntry>>();
  private readonly maxEntriesPerUser: number;
  private readonly ttlMs: number;

  constructor(
    maxEntriesPerUser: number = DEFAULT_MAX_ENTRIES_PER_USER,
    ttlMs: number = DEFAULT_TTL_MS,
  ) {
    this.maxEntriesPerUser = maxEntriesPerUser;
    this.ttlMs = ttlMs;
  }

  async get(userId: string, systemPromptText: string): Promise<ResolvedResponse | undefined> {
    const userCache = this.cache.get(userId);
    if (!userCache) return undefined;

    const hash = await this.hashText(systemPromptText);
    const entry = userCache.get(hash);
    if (!entry) return undefined;

    if (Date.now() - entry.createdAt > this.ttlMs) {
      userCache.delete(hash);
      if (userCache.size === 0) this.cache.delete(userId);
      return undefined;
    }

    return entry.result;
  }

  async set(userId: string, systemPromptText: string, result: ResolvedResponse): Promise<void> {
    let userCache = this.cache.get(userId);
    if (!userCache) {
      userCache = new Map();
      this.cache.set(userId, userCache);
    }

    // Evict oldest entry if at capacity
    if (userCache.size >= this.maxEntriesPerUser) {
      let oldestKey: string | undefined;
      let oldestTime = Infinity;
      for (const [key, entry] of userCache) {
        if (entry.createdAt < oldestTime) {
          oldestTime = entry.createdAt;
          oldestKey = key;
        }
      }
      if (oldestKey) userCache.delete(oldestKey);
    }

    const hash = await this.hashText(systemPromptText);
    userCache.set(hash, { result, createdAt: Date.now() });
  }

  private async hashText(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = new Uint8Array(hashBuffer);
    return Array.from(hashArray)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
}

/** Singleton classification cache instance for the api_platform process. */
export const classificationCache = new ClassificationCache();
