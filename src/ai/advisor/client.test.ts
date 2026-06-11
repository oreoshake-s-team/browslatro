// @vitest-environment node
import { describe, expect, test, vi } from "vitest";
import type { Advice } from "./advice";
import {
  ADVICE_ENDPOINT,
  fetchAdvice,
  fetchContextAdvice,
  PLAYER_KEY_HEADER,
} from "./client";
import {
  candidatesFixture,
  modelStateFixture,
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

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function fetchReturning(response: Response): typeof fetch {
  return vi.fn<typeof fetch>().mockResolvedValue(response);
}

async function callFetchAdvice(fetchFn: typeof fetch) {
  return fetchAdvice(modelStateFixture(), candidatesFixture(), { fetchFn });
}

describe("fetchContextAdvice", () => {
  test("posts the shop request body verbatim", async () => {
    const fetchFn = fetchReturning(jsonResponse(200, { advice: adviceFixture() }));
    await fetchContextAdvice(shopAdviceRequestFixture(), { fetchFn });
    expect(fetchFn).toHaveBeenCalledWith(
      ADVICE_ENDPOINT,
      expect.objectContaining({
        body: JSON.stringify(shopAdviceRequestFixture()),
      }),
    );
  });

  test("returns the advice for a pack request", async () => {
    const result = await fetchContextAdvice(packAdviceRequestFixture(), {
      fetchFn: fetchReturning(jsonResponse(200, { advice: adviceFixture() })),
    });
    expect(result).toEqual({ ok: true, advice: adviceFixture() });
  });

  test("rejects advice whose indices fall outside the candidate range", async () => {
    const outOfRange = { ...adviceFixture(), recommendationIndex: 9 };
    const result = await fetchContextAdvice(shopAdviceRequestFixture(), {
      fetchFn: fetchReturning(jsonResponse(200, { advice: outOfRange })),
    });
    expect(result).toEqual({ ok: false, code: "invalid_response" });
  });
});

describe("fetchAdvice", () => {
  test("returns the advice on a 200 response", async () => {
    const result = await callFetchAdvice(
      fetchReturning(jsonResponse(200, { advice: adviceFixture() })),
    );
    expect(result).toEqual({ ok: true, advice: adviceFixture() });
  });

  test("posts the state and candidates to the advice endpoint", async () => {
    const fetchFn = fetchReturning(jsonResponse(200, { advice: adviceFixture() }));
    await callFetchAdvice(fetchFn);
    expect(fetchFn).toHaveBeenCalledWith(
      ADVICE_ENDPOINT,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          state: modelStateFixture(),
          candidates: candidatesFixture(),
        }),
      }),
    );
  });


  test("attaches the player key header when one is provided", async () => {
    const fetchFn = fetchReturning(jsonResponse(200, { advice: adviceFixture() }));
    await fetchAdvice(modelStateFixture(), candidatesFixture(), {
      fetchFn,
      playerKey: "sk-ant-player",
    });
    expect(fetchFn).toHaveBeenCalledWith(
      ADVICE_ENDPOINT,
      expect.objectContaining({
        headers: expect.objectContaining({
          [PLAYER_KEY_HEADER]: "sk-ant-player",
        }),
      }),
    );
  });

  test("omits the player key header when the key is null", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(200, { advice: adviceFixture() }));
    await fetchAdvice(modelStateFixture(), candidatesFixture(), {
      fetchFn,
      playerKey: null,
    });
    const headers = fetchFn.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers[PLAYER_KEY_HEADER]).toBeUndefined();
  });

  test("surfaces the retry-after wait on a rate-limited response", async () => {
    const response = new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: { "content-type": "application/json", "retry-after": "3600" },
    });
    const result = await callFetchAdvice(fetchReturning(response));
    expect(result).toEqual({
      ok: false,
      code: "rate_limited",
      retryAfterSeconds: 3600,
    });
  });

  test("maps a server rate limit to its machine-readable code", async () => {
    const result = await callFetchAdvice(
      fetchReturning(jsonResponse(429, { error: "rate_limited" })),
    );
    expect(result).toEqual({ ok: false, code: "rate_limited" });
  });

  test("maps an upstream model timeout to its machine-readable code", async () => {
    const result = await callFetchAdvice(
      fetchReturning(jsonResponse(504, { error: "model_timeout" })),
    );
    expect(result).toEqual({ ok: false, code: "model_timeout" });
  });

  test("maps a payload-too-large rejection to its machine-readable code", async () => {
    const result = await callFetchAdvice(
      fetchReturning(jsonResponse(413, { error: "payload_too_large" })),
    );
    expect(result).toEqual({ ok: false, code: "payload_too_large" });
  });

  test("maps a model refusal to its machine-readable code", async () => {
    const result = await callFetchAdvice(
      fetchReturning(jsonResponse(502, { error: "model_refusal" })),
    );
    expect(result).toEqual({ ok: false, code: "model_refusal" });
  });

  test("maps an unknown server error code to invalid_response", async () => {
    const result = await callFetchAdvice(
      fetchReturning(jsonResponse(500, { error: "mystery" })),
    );
    expect(result).toEqual({ ok: false, code: "invalid_response" });
  });

  test("maps a network failure to network_error", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new TypeError("fetch failed"));
    const result = await callFetchAdvice(fetchFn);
    expect(result).toEqual({ ok: false, code: "network_error" });
  });

  test("maps an aborted request to timeout", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    const result = await callFetchAdvice(fetchFn);
    expect(result).toEqual({ ok: false, code: "timeout" });
  });

  test("rejects a non-JSON response body", async () => {
    const fetchFn = fetchReturning(new Response("<html>", { status: 200 }));
    const result = await callFetchAdvice(fetchFn);
    expect(result).toEqual({ ok: false, code: "invalid_response" });
  });

  test("rejects advice whose indices fall outside the sent candidates", async () => {
    const advice = { ...adviceFixture(), recommendationIndex: 5 };
    const result = await callFetchAdvice(fetchReturning(jsonResponse(200, { advice })));
    expect(result).toEqual({ ok: false, code: "invalid_response" });
  });

  test("rejects a 200 response without an advice field", async () => {
    const result = await callFetchAdvice(fetchReturning(jsonResponse(200, {})));
    expect(result).toEqual({ ok: false, code: "invalid_response" });
  });
});
