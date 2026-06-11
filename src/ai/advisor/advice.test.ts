// @vitest-environment node
import { describe, expect, test } from "vitest";
import { isAdvice, type Advice } from "./advice";

function validAdvice(): Advice {
  return {
    recommendationIndex: 0,
    alternativeIndex: 1,
    whyAlternativeWorse: "Discarding wastes a strong pair.",
    explanation: "Play the pair of nines for the highest scored hand.",
    concept: "Bank guaranteed score before chasing draws.",
  };
}

describe("isAdvice", () => {
  test("accepts a valid advice object", () => {
    expect(isAdvice(validAdvice(), 2)).toBe(true);
  });

  test("rejects a non-object value", () => {
    expect(isAdvice("advice", 2)).toBe(false);
  });

  test("rejects null", () => {
    expect(isAdvice(null, 2)).toBe(false);
  });

  test("rejects a non-numeric recommendation index", () => {
    expect(isAdvice({ ...validAdvice(), recommendationIndex: "0" }, 2)).toBe(false);
  });

  test("rejects a fractional recommendation index", () => {
    expect(isAdvice({ ...validAdvice(), recommendationIndex: 0.5 }, 2)).toBe(false);
  });

  test("rejects a recommendation index outside the candidate range", () => {
    expect(isAdvice({ ...validAdvice(), recommendationIndex: 2 }, 2)).toBe(false);
  });

  test("rejects a negative alternative index", () => {
    expect(isAdvice({ ...validAdvice(), alternativeIndex: -1 }, 2)).toBe(false);
  });

  test("rejects an alternative equal to the recommendation", () => {
    expect(isAdvice({ ...validAdvice(), alternativeIndex: 0 }, 2)).toBe(false);
  });

  test("rejects a missing explanation", () => {
    const advice: Record<string, unknown> = { ...validAdvice() };
    delete advice.explanation;
    expect(isAdvice(advice, 2)).toBe(false);
  });

  test("rejects a non-string concept", () => {
    expect(isAdvice({ ...validAdvice(), concept: 7 }, 2)).toBe(false);
  });
});
