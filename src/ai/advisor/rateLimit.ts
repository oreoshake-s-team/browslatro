export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly retryAfterSeconds: number;
}

export interface RateLimiter {
  check(key: string): RateLimitDecision;
}

export interface RateLimiterOptions {
  readonly limit: number;
  readonly windowMs: number;
  readonly now?: () => number;
}

export function createRateLimiter({
  limit,
  windowMs,
  now = Date.now,
}: RateLimiterOptions): RateLimiter {
  const hitsByKey = new Map<string, ReadonlyArray<number>>();
  return {
    check(key) {
      const current = now();
      const cutoff = current - windowMs;
      for (const [existingKey, hits] of hitsByKey) {
        const fresh = hits.filter((hit) => hit > cutoff);
        if (fresh.length === 0) hitsByKey.delete(existingKey);
        else hitsByKey.set(existingKey, fresh);
      }
      const fresh = hitsByKey.get(key) ?? [];
      if (fresh.length >= limit) {
        const retryAfterMs = fresh[0] + windowMs - current;
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
        };
      }
      hitsByKey.set(key, [...fresh, current]);
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
}
