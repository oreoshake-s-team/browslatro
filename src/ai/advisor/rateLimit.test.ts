// @vitest-environment node
import { describe, expect, test } from "vitest";
import { createRateLimiter } from "./rateLimit";

describe("createRateLimiter", () => {
  test("allows requests under the limit", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1_000, now: () => 0 });
    limiter.check("key");
    expect(limiter.check("key").allowed).toBe(true);
  });

  test("blocks requests over the limit", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1_000, now: () => 0 });
    limiter.check("key");
    limiter.check("key");
    expect(limiter.check("key").allowed).toBe(false);
  });

  test("reports zero wait when a request is allowed", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: () => 0 });
    expect(limiter.check("key").retryAfterSeconds).toBe(0);
  });

  test("reports how many seconds to wait before retrying", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 5_000, now: () => 0 });
    limiter.check("key");
    expect(limiter.check("key").retryAfterSeconds).toBe(5);
  });

  test("allows requests again once the window has passed", () => {
    let time = 0;
    const limiter = createRateLimiter({
      limit: 1,
      windowMs: 1_000,
      now: () => time,
    });
    limiter.check("key");
    time = 1_001;
    expect(limiter.check("key").allowed).toBe(true);
  });

  test("tracks limits per key", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: () => 0 });
    limiter.check("first");
    expect(limiter.check("second").allowed).toBe(true);
  });
});
