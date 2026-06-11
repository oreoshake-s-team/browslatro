// @vitest-environment node
import { describe, expect, test, vi } from "vitest";
import { handleAdviceRequest, type AdviceHandlerDeps } from "./handler";
import type { Advice, AdviceModelResult } from "./model";
import { createRateLimiter } from "./rateLimit";
import { adviceRequestFixture, postAdvice } from "./test-helpers";

function adviceFixture(): Advice {
  return {
    recommendationIndex: 0,
    alternativeIndex: 1,
    whyAlternativeWorse: "Discarding wastes a strong pair.",
    explanation: "Play the pair of nines for the highest scored hand.",
    concept: "Bank guaranteed score before chasing draws.",
  };
}

function makeDeps(extra?: Partial<AdviceHandlerDeps>): AdviceHandlerDeps {
  return {
    ipLimiter: createRateLimiter({ limit: 100, windowMs: 60_000 }),
    globalLimiter: createRateLimiter({ limit: 100, windowMs: 60_000 }),
    getApiKey: () => "sk-ant-test",
    requestAdvice: async () => ({ ok: true, advice: adviceFixture() }),
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

  test("answers valid requests with the model's advice", async () => {
    const response = await handleAdviceRequest(
      postAdvice(adviceRequestFixture()),
      makeDeps(),
    );
    expect(await response.json()).toEqual({ advice: adviceFixture() });
  });

  test("answers valid requests with a 200 status", async () => {
    const response = await handleAdviceRequest(
      postAdvice(adviceRequestFixture()),
      makeDeps(),
    );
    expect(response.status).toBe(200);
  });

  test("passes the configured api key to the model call", async () => {
    const requestAdvice = vi
      .fn<AdviceHandlerDeps["requestAdvice"]>()
      .mockResolvedValue({ ok: true, advice: adviceFixture() });
    await handleAdviceRequest(
      postAdvice(adviceRequestFixture()),
      makeDeps({ requestAdvice }),
    );
    expect(requestAdvice).toHaveBeenCalledWith(
      adviceRequestFixture(),
      "sk-ant-test",
    );
  });

  test("propagates a model failure's status code", async () => {
    const failure: AdviceModelResult = {
      ok: false,
      status: 504,
      code: "model_timeout",
    };
    const response = await handleAdviceRequest(
      postAdvice(adviceRequestFixture()),
      makeDeps({ requestAdvice: async () => failure }),
    );
    expect(response.status).toBe(504);
  });

  test("propagates a model failure's error code", async () => {
    const failure: AdviceModelResult = {
      ok: false,
      status: 503,
      code: "advisor_busy",
    };
    const response = await handleAdviceRequest(
      postAdvice(adviceRequestFixture()),
      makeDeps({ requestAdvice: async () => failure }),
    );
    expect(await response.json()).toEqual({ error: "advisor_busy" });
  });
});
