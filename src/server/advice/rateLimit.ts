export interface RateLimitConfig {
  readonly limit: number;
  readonly windowMs: number;
}

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly retryAfterSeconds: number;
}

const MAX_TRACKED_KEYS = 10_000;

export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly config: RateLimitConfig) {}

  check(key: string, now: number): RateLimitDecision {
    this.prune(now);
    const windowStart = now - this.config.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > windowStart);
    if (recent.length >= this.config.limit) {
      this.hits.set(key, recent);
      const retryAfterSeconds = Math.ceil(
        (recent[0] + this.config.windowMs - now) / 1000,
      );
      return { allowed: false, retryAfterSeconds };
    }
    recent.push(now);
    this.hits.set(key, recent);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  private prune(now: number): void {
    if (this.hits.size < MAX_TRACKED_KEYS) return;
    const windowStart = now - this.config.windowMs;
    for (const [key, stamps] of this.hits) {
      if (stamps.length === 0 || stamps[stamps.length - 1] <= windowStart) {
        this.hits.delete(key);
      }
    }
  }
}
