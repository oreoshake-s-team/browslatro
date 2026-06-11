// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  createAdviceRateLimiter,
  createDurableRateLimiter,
  redisRestConfigFromEnv,
  type RedisRestConfig,
} from "./durableRateLimit";
import { createRateLimiter, type RateLimiter } from "./rateLimit";

const fetchMock = vi.fn();

const config: RedisRestConfig = {
  url: "https://redis.example.com",
  token: "tok",
};

function durableLimiter(limit = 2): RateLimiter {
  return createDurableRateLimiter({
    limit,
    windowMs: 60_000,
    prefix: "ip",
    config,
    fallback: createRateLimiter({ limit: 1, windowMs: 60_000 }),
  });
}

function redisResponse(count: number, ttl: number): Response {
  return new Response(
    JSON.stringify([{ result: count }, { result: 1 }, { result: ttl }]),
    { status: 200 },
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("createDurableRateLimiter", () => {
  test("allows requests while the redis count is within the limit", async () => {
    fetchMock.mockResolvedValue(redisResponse(2, 60));
    expect((await durableLimiter().check("a")).allowed).toBe(true);
  });

  test("blocks requests once the redis count exceeds the limit", async () => {
    fetchMock.mockResolvedValue(redisResponse(3, 42));
    expect((await durableLimiter().check("a")).allowed).toBe(false);
  });

  test("reports the redis ttl as the retry delay", async () => {
    fetchMock.mockResolvedValue(redisResponse(3, 42));
    expect((await durableLimiter().check("a")).retryAfterSeconds).toBe(42);
  });

  test("falls back to the window length when redis reports no ttl", async () => {
    fetchMock.mockResolvedValue(redisResponse(3, -1));
    expect((await durableLimiter().check("a")).retryAfterSeconds).toBe(60);
  });

  test("posts to the pipeline endpoint", async () => {
    fetchMock.mockResolvedValue(redisResponse(1, 60));
    await durableLimiter().check("a");
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://redis.example.com/pipeline",
    );
  });

  test("sends the bearer token with redis requests", async () => {
    fetchMock.mockResolvedValue(redisResponse(1, 60));
    await durableLimiter().check("a");
    expect(fetchMock.mock.calls[0][1].headers.authorization).toBe(
      "Bearer tok",
    );
  });

  test("issues increment, expiry, and ttl commands on the namespaced key", async () => {
    fetchMock.mockResolvedValue(redisResponse(1, 60));
    await durableLimiter().check("203.0.113.7");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual([
      ["INCR", "advice:ip:203.0.113.7"],
      ["EXPIRE", "advice:ip:203.0.113.7", "60", "NX"],
      ["TTL", "advice:ip:203.0.113.7"],
    ]);
  });

  test("falls back to the in-memory limiter when redis is unreachable", async () => {
    fetchMock.mockRejectedValue(new Error("down"));
    expect((await durableLimiter().check("a")).allowed).toBe(true);
  });

  test("falls back to the in-memory limiter on an error status", async () => {
    fetchMock.mockResolvedValue(new Response("oops", { status: 500 }));
    expect((await durableLimiter().check("a")).allowed).toBe(true);
  });

  test("falls back to the in-memory limiter on a malformed payload", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: 1 }), { status: 200 }),
    );
    expect((await durableLimiter().check("a")).allowed).toBe(true);
  });

  test("keeps counting in memory while redis is failing", async () => {
    fetchMock.mockRejectedValue(new Error("down"));
    const limiter = durableLimiter();
    await limiter.check("a");
    expect((await limiter.check("a")).allowed).toBe(false);
  });
});

describe("redisRestConfigFromEnv", () => {
  test("reads the upstash env vars", () => {
    expect(
      redisRestConfigFromEnv({
        UPSTASH_REDIS_REST_URL: "https://u.example.com",
        UPSTASH_REDIS_REST_TOKEN: "t",
      }),
    ).toEqual({ url: "https://u.example.com", token: "t" });
  });

  test("reads the vercel kv aliases", () => {
    expect(
      redisRestConfigFromEnv({
        KV_REST_API_URL: "https://kv.example.com",
        KV_REST_API_TOKEN: "t",
      }),
    ).toEqual({ url: "https://kv.example.com", token: "t" });
  });

  test("returns null when the token is missing", () => {
    expect(
      redisRestConfigFromEnv({ UPSTASH_REDIS_REST_URL: "https://u.example.com" }),
    ).toBeNull();
  });

  test("returns null when unconfigured", () => {
    expect(redisRestConfigFromEnv({})).toBeNull();
  });
});

describe("createAdviceRateLimiter", () => {
  test("skips redis when the store is unconfigured", async () => {
    const limiter = createAdviceRateLimiter(
      { limit: 1, windowMs: 60_000 },
      "ip",
      {},
    );
    await limiter.check("a");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("uses redis when the store is configured", async () => {
    fetchMock.mockResolvedValue(redisResponse(1, 60));
    const limiter = createAdviceRateLimiter(
      { limit: 1, windowMs: 60_000 },
      "ip",
      {
        UPSTASH_REDIS_REST_URL: "https://u.example.com",
        UPSTASH_REDIS_REST_TOKEN: "t",
      },
    );
    await limiter.check("a");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
