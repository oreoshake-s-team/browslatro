import { describe, expect, it } from "vitest";
import { SlidingWindowRateLimiter } from "./rateLimit";

describe("SlidingWindowRateLimiter", () => {
  it("allows requests under the limit", () => {
    const limiter = new SlidingWindowRateLimiter({ limit: 2, windowMs: 1000 });
    limiter.check("a", 0);
    expect(limiter.check("a", 100).allowed).toBe(true);
  });

  it("blocks the request that exceeds the limit", () => {
    const limiter = new SlidingWindowRateLimiter({ limit: 2, windowMs: 1000 });
    limiter.check("a", 0);
    limiter.check("a", 100);
    expect(limiter.check("a", 200).allowed).toBe(false);
  });

  it("reports a positive retry-after when blocked", () => {
    const limiter = new SlidingWindowRateLimiter({ limit: 1, windowMs: 1000 });
    limiter.check("a", 0);
    expect(limiter.check("a", 200).retryAfterSeconds).toBe(1);
  });

  it("allows again once the window slides past old hits", () => {
    const limiter = new SlidingWindowRateLimiter({ limit: 1, windowMs: 1000 });
    limiter.check("a", 0);
    expect(limiter.check("a", 1001).allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const limiter = new SlidingWindowRateLimiter({ limit: 1, windowMs: 1000 });
    limiter.check("a", 0);
    expect(limiter.check("b", 0).allowed).toBe(true);
  });

  it("reports zero retry-after when allowed", () => {
    const limiter = new SlidingWindowRateLimiter({ limit: 1, windowMs: 1000 });
    expect(limiter.check("a", 0).retryAfterSeconds).toBe(0);
  });
});
