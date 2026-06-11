import { describe, expect, it } from "vitest";
import { createAdviceHandler, MAX_BODY_BYTES, type AdviseFn } from "./handler";
import type { Advice } from "./model";
import { adviceRequest, validAdviceBody } from "./test-helpers";

const LOOSE = { perIpLimit: 100, globalLimit: 100, windowMs: 60_000 };

const ADVICE: Advice = {
  recommendationIndex: 0,
  alternativeIndex: 1,
  whyAlternativeWorse: "Discarding wastes a strong pair.",
  explanation: "Play the pair of aces for the highest scored hand.",
  concept: "Bank guaranteed score before chasing draws.",
};

const okAdvise: AdviseFn = async () => ({ ok: true, advice: ADVICE });

describe("advice handler", () => {
  it("returns 200 with the model advice for a valid payload", async () => {
    const handler = createAdviceHandler(LOOSE, okAdvise);
    const response = await handler(adviceRequest(validAdviceBody()));
    expect([response.status, (await response.json()).advice]).toEqual([
      200,
      ADVICE,
    ]);
  });

  it("passes model failures through as machine-readable errors", async () => {
    const failingAdvise: AdviseFn = async () => ({
      ok: false,
      status: 504,
      code: "model_timeout",
    });
    const handler = createAdviceHandler(LOOSE, failingAdvise);
    const response = await handler(adviceRequest(validAdviceBody()));
    expect([response.status, (await response.json()).error.code]).toEqual([
      504,
      "model_timeout",
    ]);
  });

  it("returns 400 invalid_json for a malformed body", async () => {
    const handler = createAdviceHandler(LOOSE, okAdvise);
    const response = await handler(adviceRequest("{not json"));
    expect([response.status, (await response.json()).error.code]).toEqual([
      400,
      "invalid_json",
    ]);
  });

  it("returns 400 invalid_request with a detail for a contract violation", async () => {
    const handler = createAdviceHandler(LOOSE, okAdvise);
    const response = await handler(adviceRequest({ state: {}, options: [] }));
    const payload = await response.json();
    expect([response.status, payload.error.code, typeof payload.error.detail]).toEqual([
      400,
      "invalid_request",
      "string",
    ]);
  });

  it("returns 413 payload_too_large for an oversized body", async () => {
    const handler = createAdviceHandler(LOOSE, okAdvise);
    const body = validAdviceBody();
    body.padding = "x".repeat(MAX_BODY_BYTES);
    const response = await handler(adviceRequest(body));
    expect([response.status, (await response.json()).error.code]).toEqual([
      413,
      "payload_too_large",
    ]);
  });

  it("returns 429 rate_limited with retry-after once the per-IP limit is exceeded", async () => {
    const handler = createAdviceHandler({ ...LOOSE, perIpLimit: 2 }, okAdvise);
    const headers = { "x-forwarded-for": "203.0.113.7" };
    await handler(adviceRequest(validAdviceBody(), headers));
    await handler(adviceRequest(validAdviceBody(), headers));
    const response = await handler(adviceRequest(validAdviceBody(), headers));
    expect([
      response.status,
      (await response.json()).error.code,
      Number(response.headers.get("retry-after")) > 0,
    ]).toEqual([429, "rate_limited", true]);
  });

  it("keeps separate per-IP budgets for distinct clients", async () => {
    const handler = createAdviceHandler({ ...LOOSE, perIpLimit: 1 }, okAdvise);
    await handler(
      adviceRequest(validAdviceBody(), { "x-forwarded-for": "203.0.113.7" }),
    );
    const response = await handler(
      adviceRequest(validAdviceBody(), { "x-forwarded-for": "203.0.113.8" }),
    );
    expect(response.status).toBe(200);
  });

  it("returns 429 advisor_busy once the global limit is exceeded across clients", async () => {
    const handler = createAdviceHandler({ ...LOOSE, globalLimit: 2 }, okAdvise);
    await handler(
      adviceRequest(validAdviceBody(), { "x-forwarded-for": "203.0.113.1" }),
    );
    await handler(
      adviceRequest(validAdviceBody(), { "x-forwarded-for": "203.0.113.2" }),
    );
    const response = await handler(
      adviceRequest(validAdviceBody(), { "x-forwarded-for": "203.0.113.3" }),
    );
    expect([response.status, (await response.json()).error.code]).toEqual([
      429,
      "advisor_busy",
    ]);
  });

  it("buckets requests without a forwarded address under one shared key", async () => {
    const handler = createAdviceHandler({ ...LOOSE, perIpLimit: 1 }, okAdvise);
    await handler(adviceRequest(validAdviceBody()));
    const response = await handler(adviceRequest(validAdviceBody()));
    expect(response.status).toBe(429);
  });
});
