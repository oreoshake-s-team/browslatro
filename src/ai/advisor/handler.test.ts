// @vitest-environment node
import { describe, expect, test, vi } from "vitest";
import {
  handleAdviceRequest,
  IP_RATE_LIMIT,
  MAX_BODY_CHARS,
  PLAYER_KEY_HEADER,
  type AdviceHandlerDeps,
} from "./handler";
import type { Advice, AdviceModelResult } from "./model";
import { createRateLimiter } from "./rateLimit";
import {
  adviceRequestFixture,
  blindAdviceRequestFixture,
  postAdvice,
  packAdviceRequestFixture,
  shopAdviceRequestFixture,
} from "./test-helpers";

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

  test("rejects oversized bodies before parsing", async () => {
    const oversized = JSON.stringify(adviceRequestFixture()).padEnd(
      MAX_BODY_CHARS + 1,
      " ",
    );
    const response = await handleAdviceRequest(postAdvice(oversized), makeDeps());
    expect(response.status).toBe(413);
  });

  test("labels oversized bodies with a machine-readable code", async () => {
    const oversized = JSON.stringify(adviceRequestFixture()).padEnd(
      MAX_BODY_CHARS + 1,
      " ",
    );
    const response = await handleAdviceRequest(postAdvice(oversized), makeDeps());
    expect(await response.json()).toEqual({ error: "payload_too_large" });
  });

  test("rejects bodies that fail validation", async () => {
    const response = await handleAdviceRequest(
      postAdvice({ state: {}, candidates: [] }),
      makeDeps(),
    );
    expect(response.status).toBe(400);
  });

  test("accepts a shop-context request", async () => {
    const response = await handleAdviceRequest(
      postAdvice(shopAdviceRequestFixture()),
      makeDeps(),
    );
    expect(response.status).toBe(200);
  });

  test("accepts a pack-context request", async () => {
    const response = await handleAdviceRequest(
      postAdvice(packAdviceRequestFixture()),
      makeDeps(),
    );
    expect(response.status).toBe(200);
  });

  test("accepts a blind-context request", async () => {
    const response = await handleAdviceRequest(
      postAdvice(blindAdviceRequestFixture()),
      makeDeps(),
    );
    expect(response.status).toBe(200);
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

describe("handleAdviceRequest with a player key", () => {
  function postWithPlayerKey(body: unknown, key = "sk-ant-player"): Request {
    return new Request("https://example.com/api/advice", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.7",
        [PLAYER_KEY_HEADER]: key,
      },
      body: JSON.stringify(body),
    });
  }

  test("keyless requests get three explanations per hour", () => {
    expect(IP_RATE_LIMIT).toEqual({ limit: 3, windowMs: 3_600_000 });
  });

  test("bypasses the per-ip and global limits", async () => {
    const deps = makeDeps({
      ipLimiter: createRateLimiter({ limit: 1, windowMs: 60_000 }),
      globalLimiter: createRateLimiter({ limit: 1, windowMs: 60_000 }),
    });
    await handleAdviceRequest(postWithPlayerKey(adviceRequestFixture()), deps);
    const second = await handleAdviceRequest(
      postWithPlayerKey(adviceRequestFixture()),
      deps,
    );
    expect(second.status).toBe(200);
  });

  test("uses the player key for the model call", async () => {
    const requestAdvice = vi
      .fn<AdviceHandlerDeps["requestAdvice"]>()
      .mockResolvedValue({ ok: true, advice: adviceFixture() });
    await handleAdviceRequest(
      postWithPlayerKey(adviceRequestFixture()),
      makeDeps({ requestAdvice }),
    );
    expect(requestAdvice).toHaveBeenCalledWith(
      adviceRequestFixture(),
      "sk-ant-player",
    );
  });

  test("serves player-key requests even without a server key", async () => {
    const response = await handleAdviceRequest(
      postWithPlayerKey(adviceRequestFixture()),
      makeDeps({ getApiKey: () => undefined }),
    );
    expect(response.status).toBe(200);
  });

  test("a blank player key falls back to keyless limits", async () => {
    const deps = makeDeps({
      ipLimiter: createRateLimiter({ limit: 1, windowMs: 60_000 }),
    });
    await handleAdviceRequest(postWithPlayerKey(adviceRequestFixture(), " "), deps);
    const second = await handleAdviceRequest(
      postWithPlayerKey(adviceRequestFixture(), " "),
      deps,
    );
    expect(second.status).toBe(429);
  });

  test("surfaces an invalid player key to the client", async () => {
    const failure: AdviceModelResult = {
      ok: false,
      status: 401,
      code: "invalid_player_key",
    };
    const response = await handleAdviceRequest(
      postWithPlayerKey(adviceRequestFixture()),
      makeDeps({ requestAdvice: async () => failure }),
    );
    expect(await response.json()).toEqual({ error: "invalid_player_key" });
  });

  test("masks a server-key auth failure as a generic model error", async () => {
    const failure: AdviceModelResult = {
      ok: false,
      status: 401,
      code: "invalid_player_key",
    };
    const response = await handleAdviceRequest(
      postAdvice(adviceRequestFixture()),
      makeDeps({ requestAdvice: async () => failure }),
    );
    expect(await response.json()).toEqual({ error: "model_error" });
  });
});
