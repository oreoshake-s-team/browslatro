import Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildUserMessage,
  mapModelError,
  parseAdvice,
  requestAdvice,
  type Advice,
} from "./model";
import { validAdviceBody } from "./test-helpers";
import { parseAdviceRequest } from "./validate";

function parsedFixture() {
  const parsed = parseAdviceRequest(validAdviceBody());
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

function validAdvice(): Advice {
  return {
    recommendationIndex: 0,
    alternativeIndex: 1,
    whyAlternativeWorse: "Discarding wastes a strong pair.",
    explanation: "Play the pair of aces for the highest scored hand.",
    concept: "Bank guaranteed score before chasing draws.",
  };
}

describe("buildUserMessage", () => {
  it("annotates every candidate with its index", () => {
    const message = buildUserMessage(parsedFixture());
    expect(message).toContain('"index":1');
  });

  it("includes the serialized game state", () => {
    const message = buildUserMessage(parsedFixture());
    expect(message).toContain('"scoreTarget":300');
  });
});

describe("parseAdvice", () => {
  it("accepts a valid advice object", () => {
    expect(parseAdvice(JSON.stringify(validAdvice()), 2)).toEqual(validAdvice());
  });

  it("rejects non-JSON text", () => {
    expect(parseAdvice("not json", 2)).toBeNull();
  });

  it("rejects a recommendation index outside the candidate range", () => {
    expect(
      parseAdvice(JSON.stringify({ ...validAdvice(), recommendationIndex: 2 }), 2),
    ).toBeNull();
  });

  it("rejects a negative alternative index", () => {
    expect(
      parseAdvice(JSON.stringify({ ...validAdvice(), alternativeIndex: -1 }), 2),
    ).toBeNull();
  });

  it("rejects an alternative equal to the recommendation", () => {
    expect(
      parseAdvice(JSON.stringify({ ...validAdvice(), alternativeIndex: 0 }), 2),
    ).toBeNull();
  });

  it("rejects a missing explanation", () => {
    const advice: Record<string, unknown> = { ...validAdvice() };
    delete advice.explanation;
    expect(parseAdvice(JSON.stringify(advice), 2)).toBeNull();
  });
});

describe("mapModelError", () => {
  it("maps upstream rate limiting to advisor_busy", () => {
    const error = Object.create(Anthropic.RateLimitError.prototype) as Error;
    expect(mapModelError(error)).toEqual({
      ok: false,
      status: 503,
      code: "advisor_busy",
    });
  });

  it("maps a timeout to model_timeout", () => {
    const error = Object.create(
      Anthropic.APIConnectionTimeoutError.prototype,
    ) as Error;
    expect(mapModelError(error)).toEqual({
      ok: false,
      status: 504,
      code: "model_timeout",
    });
  });

  it("maps unknown failures to model_error", () => {
    expect(mapModelError(new Error("boom"))).toEqual({
      ok: false,
      status: 502,
      code: "model_error",
    });
  });
});

describe("requestAdvice", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns model_not_configured when the API key is absent", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(await requestAdvice(parsedFixture())).toEqual({
      ok: false,
      status: 501,
      code: "model_not_configured",
    });
  });
});
