// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import { adviceRequestFixture } from "./test-helpers";

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    static RateLimitError = class extends Error {};
    static APIConnectionTimeoutError = class extends Error {};
    static AuthenticationError = class extends Error {};
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


  test("maps an authentication failure to invalid_player_key", async () => {
    const AuthError = (
      (await import("@anthropic-ai/sdk")).default as unknown as {
        AuthenticationError: new () => Error;
      }
    ).AuthenticationError;
    createMock.mockRejectedValue(new AuthError());
    const result = await requestAdvice(adviceRequestFixture(), "sk-bad");
    expect(result).toEqual({
      ok: false,
      status: 401,
      code: "invalid_player_key",
    });
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

  test("sends the system prompt as an ephemeral cached block", async () => {
    createMock.mockResolvedValue(textResponse(adviceText()));
    await requestAdvice(adviceRequestFixture(), "sk-test");
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        system: [
          expect.objectContaining({
            type: "text",
            cache_control: { type: "ephemeral" },
          }),
        ],
      }),
    );
  });

  test("requests adaptive thinking and low effort by default", async () => {
    createMock.mockResolvedValue(textResponse(adviceText()));
    await requestAdvice(adviceRequestFixture(), "sk-test");
    const params = createMock.mock.calls[0][0] as {
      thinking?: unknown;
      output_config: { effort?: unknown };
    };
    expect({ thinking: params.thinking, effort: params.output_config.effort }).toEqual({
      thinking: { type: "adaptive" },
      effort: "low",
    });
  });

  test("omits adaptive thinking when ADVISOR_THINKING is none", async () => {
    vi.stubEnv("ADVISOR_THINKING", "none");
    createMock.mockResolvedValue(textResponse(adviceText()));
    await requestAdvice(adviceRequestFixture(), "sk-test");
    expect(createMock.mock.calls[0][0]).not.toHaveProperty("thinking");
  });

  test("omits the effort parameter when ADVISOR_EFFORT is none", async () => {
    vi.stubEnv("ADVISOR_EFFORT", "none");
    createMock.mockResolvedValue(textResponse(adviceText()));
    await requestAdvice(adviceRequestFixture(), "sk-test");
    const params = createMock.mock.calls[0][0] as { output_config: object };
    expect(params.output_config).not.toHaveProperty("effort");
  });
});
