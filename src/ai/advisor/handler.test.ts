// @vitest-environment node
import { describe, expect, test } from "vitest";
import { handleAdviceRequest, type AdviceHandlerDeps } from "./handler";
import { createRateLimiter } from "./rateLimit";
import { adviceRequestFixture, postAdvice } from "./test-helpers";

function makeDeps(extra?: Partial<AdviceHandlerDeps>): AdviceHandlerDeps {
  return {
    ipLimiter: createRateLimiter({ limit: 100, windowMs: 60_000 }),
    globalLimiter: createRateLimiter({ limit: 100, windowMs: 60_000 }),
    getApiKey: () => "sk-ant-test",
    ...extra,
  };
}

describe("handleAdviceRequest", () => {
  test("rejects non-POST methods", async () => {
    const response = await handleAdviceRequest(
      new Request("https://example.com/api/advice"),
      makeDeps(),
    );
    expect(response.status).toBe(405);
  });

  test("reports the endpoint as unconfigured without an api key", async () => {
    const response = await handleAdviceRequest(
      postAdvice(adviceRequestFixture()),
      makeDeps({ getApiKey: () => undefined }),
    );
    expect(response.status).toBe(503);
  });

  test("rejects malformed json", async () => {
    const response = await handleAdviceRequest(postAdvice("{nope"), makeDeps());
    expect(response.status).toBe(400);
  });

  test("rejects bodies that fail validation", async () => {
    const response = await handleAdviceRequest(
      postAdvice({ state: {}, candidates: [] }),
      makeDeps(),
    );
    expect(response.status).toBe(400);
  });

  test("rate limits a client that exceeds the per-ip limit", async () => {
    const deps = makeDeps({
      ipLimiter: createRateLimiter({ limit: 1, windowMs: 60_000 }),
    });
    await handleAdviceRequest(postAdvice(adviceRequestFixture()), deps);
    const second = await handleAdviceRequest(
      postAdvice(adviceRequestFixture()),
      deps,
    );
    expect(second.status).toBe(429);
  });

  test("tells a rate-limited client when to retry", async () => {
    const deps = makeDeps({
      ipLimiter: createRateLimiter({ limit: 1, windowMs: 60_000 }),
    });
    await handleAdviceRequest(postAdvice(adviceRequestFixture()), deps);
    const second = await handleAdviceRequest(
      postAdvice(adviceRequestFixture()),
      deps,
    );
    expect(Number(second.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  test("limits clients independently by forwarded ip", async () => {
    const deps = makeDeps({
      ipLimiter: createRateLimiter({ limit: 1, windowMs: 60_000 }),
    });
    await handleAdviceRequest(
      postAdvice(adviceRequestFixture(), "198.51.100.1"),
      deps,
    );
    const other = await handleAdviceRequest(
      postAdvice(adviceRequestFixture(), "198.51.100.2"),
      deps,
    );
    expect(other.status).not.toBe(429);
  });

  test("applies the global limit across distinct ips", async () => {
    const deps = makeDeps({
      globalLimiter: createRateLimiter({ limit: 1, windowMs: 60_000 }),
    });
    await handleAdviceRequest(
      postAdvice(adviceRequestFixture(), "198.51.100.1"),
      deps,
    );
    const second = await handleAdviceRequest(
      postAdvice(adviceRequestFixture(), "198.51.100.2"),
      deps,
    );
    expect(second.status).toBe(429);
  });

  test("answers valid requests with not-implemented while the model call is pending", async () => {
    const response = await handleAdviceRequest(
      postAdvice(adviceRequestFixture()),
      makeDeps(),
    );
    expect(response.status).toBe(501);
  });
});
