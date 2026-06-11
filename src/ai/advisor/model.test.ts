// @vitest-environment node
import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, test } from "vitest";
import { buildUserMessage, mapModelError, parseAdvice, type Advice } from "./model";
import { adviceRequestFixture } from "./test-helpers";

function validAdvice(): Advice {
  return {
    recommendationIndex: 0,
    alternativeIndex: 1,
    whyAlternativeWorse: "Discarding wastes a strong pair.",
    explanation: "Play the pair of nines for the highest scored hand.",
    concept: "Bank guaranteed score before chasing draws.",
  };
}

describe("buildUserMessage", () => {
  test("annotates every candidate with its index", () => {
    const message = buildUserMessage(adviceRequestFixture());
    expect(message).toContain('"index":1');
  });

  test("includes the serialized game state", () => {
    const message = buildUserMessage(adviceRequestFixture());
    expect(message).toContain('"scoreTarget":300');
  });
});

describe("parseAdvice", () => {
  test("accepts a valid advice object", () => {
    expect(parseAdvice(JSON.stringify(validAdvice()), 2)).toEqual(validAdvice());
  });

  test("rejects non-JSON text", () => {
    expect(parseAdvice("not json", 2)).toBeNull();
  });

  test("rejects a JSON scalar", () => {
    expect(parseAdvice("42", 2)).toBeNull();
  });

  test("rejects a recommendation index outside the candidate range", () => {
    expect(
      parseAdvice(JSON.stringify({ ...validAdvice(), recommendationIndex: 2 }), 2),
    ).toBeNull();
  });

  test("rejects a negative alternative index", () => {
    expect(
      parseAdvice(JSON.stringify({ ...validAdvice(), alternativeIndex: -1 }), 2),
    ).toBeNull();
  });

  test("rejects an alternative equal to the recommendation", () => {
    expect(
      parseAdvice(JSON.stringify({ ...validAdvice(), alternativeIndex: 0 }), 2),
    ).toBeNull();
  });

  test("rejects a missing explanation", () => {
    const advice: Record<string, unknown> = { ...validAdvice() };
    delete advice.explanation;
    expect(parseAdvice(JSON.stringify(advice), 2)).toBeNull();
  });

  test("rejects a non-string concept", () => {
    expect(
      parseAdvice(JSON.stringify({ ...validAdvice(), concept: 7 }), 2),
    ).toBeNull();
  });
});

describe("mapModelError", () => {
  test("maps upstream rate limiting to advisor_busy", () => {
    const error = Object.create(Anthropic.RateLimitError.prototype) as Error;
    expect(mapModelError(error)).toEqual({
      ok: false,
      status: 503,
      code: "advisor_busy",
    });
  });

  test("maps a timeout to model_timeout", () => {
    const error = Object.create(
      Anthropic.APIConnectionTimeoutError.prototype,
    ) as Error;
    expect(mapModelError(error)).toEqual({
      ok: false,
      status: 504,
      code: "model_timeout",
    });
  });

  test("maps unknown failures to model_error", () => {
    expect(mapModelError(new Error("boom"))).toEqual({
      ok: false,
      status: 502,
      code: "model_error",
    });
  });
});
