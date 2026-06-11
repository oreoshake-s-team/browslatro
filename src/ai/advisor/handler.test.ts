// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  handleAdviceRequest,
  MAX_BODY_CHARS,
  type AdviceHandlerDeps,
} from "./handler";
import { createRateLimiter } from "./rateLimit";
import { adviceFixture, adviceRequestFixture, postAdvice } from "./test-helpers";

function makeDeps(extra?: Partial<AdviceHandlerDeps>): AdviceHandlerDeps {
  return {
    ipLimiter: createRateLimiter({ limit: 100, windowMs: 60_000 }),
    globalLimiter: createRateLimiter({ limit: 100, windowMs: 60_000 }),
    getApiKey: () => "sk-ant-test",
    requestAdvice: async () => ({
      kind: "text",
      text: JSON.stringify(adviceFixture()),
    }),
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

  test("returns advice on the happy path", async () => {
    const response = await handleAdviceRequest(
      postAdvice(adviceRequestFixture()),
      makeDeps(),
    );
    expect(response.status).toBe(200);
  });

  test("surfaces the parsed advice payload", async () => {
    const response = await handleAdviceRequest(
      postAdvice(adviceRequestFixture()),
      makeDeps(),
    );
    expect(await response.json()).toEqual({ advice: adviceFixture() });
  });

  test("maps upstream failures to a bad gateway", async () => {
    const response = await handleAdviceRequest(
      postAdvice(adviceRequestFixture()),
      makeDeps({
        requestAdvice: async () => {
          throw new Error("boom");
        },
      }),
    );
    expect(response.status).toBe(502);
  });

  test("maps refusals to a bad gateway", async () => {
    const response = await handleAdviceRequest(
      postAdvice(adviceRequestFixture()),
      makeDeps({ requestAdvice: async () => ({ kind: "refusal" }) }),
    );
    expect(response.status).toBe(502);
  });

  test("rejects oversized bodies before parsing", async () => {
    const oversized = {
      ...adviceRequestFixture(),
      state: {
        ...adviceRequestFixture().state,
        blind: {
          ...adviceRequestFixture().state.blind,
          name: "x".repeat(MAX_BODY_CHARS),
        },
      },
    };
    const response = await handleAdviceRequest(
      postAdvice(oversized),
      makeDeps(),
    );
    expect(response.status).toBe(413);
  });

  test("rejects model output that is not json", async () => {
    const response = await handleAdviceRequest(
      postAdvice(adviceRequestFixture()),
      makeDeps({
        requestAdvice: async () => ({ kind: "text", text: "not json" }),
      }),
    );
    expect(response.status).toBe(502);
  });

  test("rejects model output with an out-of-range index", async () => {
    const response = await handleAdviceRequest(
      postAdvice(adviceRequestFixture()),
      makeDeps({
        requestAdvice: async () => ({
          kind: "text",
          text: JSON.stringify({ ...adviceFixture(), recommendationIndex: 9 }),
        }),
      }),
    );
    expect(response.status).toBe(502);
  });
});
