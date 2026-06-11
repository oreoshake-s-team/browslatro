// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import { adviceRequestFixture } from "./test-helpers";

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    static RateLimitError = class extends Error {};
    static APIConnectionTimeoutError = class extends Error {};
    messages = { create: createMock };
  }
  return { default: MockAnthropic };
});

import { MODEL_ID, requestAdvice } from "./model";

function adviceText(): string {
  return JSON.stringify({
    recommendationIndex: 0,
    alternativeIndex: 1,
    whyAlternativeWorse: "Discarding wastes a strong pair.",
    explanation: "Play the pair of nines.",
    concept: "Bank guaranteed score.",
  });
}

function textResponse(text: string): unknown {
  return { stop_reason: "end_turn", content: [{ type: "text", text }] };
}

afterEach(() => {
  createMock.mockReset();
  vi.unstubAllEnvs();
});

describe("requestAdvice", () => {
  test("returns the parsed advice on a text response", async () => {
    createMock.mockResolvedValue(textResponse(adviceText()));
    const result = await requestAdvice(adviceRequestFixture(), "sk-test");
    expect(result.ok).toBe(true);
  });

  test("maps a refusal stop reason to model_refusal", async () => {
    createMock.mockResolvedValue({ stop_reason: "refusal", content: [] });
    const result = await requestAdvice(adviceRequestFixture(), "sk-test");
    expect(result).toEqual({ ok: false, status: 502, code: "model_refusal" });
  });

  test("defaults to the fixed advisor model", async () => {
    createMock.mockResolvedValue(textResponse(adviceText()));
    await requestAdvice(adviceRequestFixture(), "sk-test");
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: MODEL_ID }),
    );
  });

  test("honors the ADVISOR_MODEL environment override", async () => {
    vi.stubEnv("ADVISOR_MODEL", "claude-haiku-4-5");
    createMock.mockResolvedValue(textResponse(adviceText()));
    await requestAdvice(adviceRequestFixture(), "sk-test");
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: "claude-haiku-4-5" }),
    );
  });
});
