// @vitest-environment node
import { describe, expect, test } from "vitest";
import { createRateLimiter } from "./rateLimit";

describe("createRateLimiter", () => {
  test("allows requests under the limit", async () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1_000, now: () => 0 });
    await limiter.check("key");
    expect((await limiter.check("key")).allowed).toBe(true);
  });

  test("blocks requests over the limit", async () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1_000, now: () => 0 });
    await limiter.check("key");
    await limiter.check("key");
    expect((await limiter.check("key")).allowed).toBe(false);
  });

  test("reports zero wait when a request is allowed", async () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: () => 0 });
    expect((await limiter.check("key")).retryAfterSeconds).toBe(0);
  });

  test("reports how many seconds to wait before retrying", async () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 5_000, now: () => 0 });
    await limiter.check("key");
    expect((await limiter.check("key")).retryAfterSeconds).toBe(5);
  });

  test("allows requests again once the window has passed", async () => {
    let time = 0;
    const limiter = createRateLimiter({
      limit: 1,
      windowMs: 1_000,
      now: () => time,
    });
    await limiter.check("key");
    time = 1_001;
    expect((await limiter.check("key")).allowed).toBe(true);
  });

  test("tracks limits per key", async () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000, now: () => 0 });
    await limiter.check("first");
    expect((await limiter.check("second")).allowed).toBe(true);
  });
});
