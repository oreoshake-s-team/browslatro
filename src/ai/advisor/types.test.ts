// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  adviceFixture,
  adviceRequestFixture,
  candidatesFixture,
} from "./test-helpers";
import { MAX_CANDIDATES, parseAdvice, parseAdviceRequest } from "./types";

describe("parseAdviceRequest", () => {
  test("accepts a valid request body", () => {
    expect(parseAdviceRequest(adviceRequestFixture())).not.toBeNull();
  });

  test("rejects a non-object body", () => {
    expect(parseAdviceRequest("nope")).toBeNull();
  });

  test("rejects a missing state", () => {
    expect(parseAdviceRequest({ candidates: candidatesFixture() })).toBeNull();
  });

  test("rejects missing candidates", () => {
    expect(parseAdviceRequest({ state: modelStateOnly() })).toBeNull();
  });

  test("rejects empty candidates", () => {
    expect(
      parseAdviceRequest({ ...adviceRequestFixture(), candidates: [] }),
    ).toBeNull();
  });

  test("rejects more candidates than the cap", () => {
    const candidates = Array.from(
      { length: MAX_CANDIDATES + 1 },
      () => candidatesFixture()[0],
    );
    expect(
      parseAdviceRequest({ ...adviceRequestFixture(), candidates }),
    ).toBeNull();
  });

  test("rejects a candidate with an unknown action", () => {
    const candidates = [{ ...candidatesFixture()[0], action: "fold" }];
    expect(
      parseAdviceRequest({ ...adviceRequestFixture(), candidates }),
    ).toBeNull();
  });

  test("rejects a candidate with non-numeric card ids", () => {
    const candidates = [{ ...candidatesFixture()[0], cardIds: ["1"] }];
    expect(
      parseAdviceRequest({ ...adviceRequestFixture(), candidates }),
    ).toBeNull();
  });
});

function modelStateOnly(): unknown {
  return adviceRequestFixture().state;
}

describe("parseAdvice", () => {
  test("accepts valid advice", () => {
    expect(parseAdvice(adviceFixture(), 2)).toEqual(adviceFixture());
  });

  test("accepts a null alternative", () => {
    const advice = {
      ...adviceFixture(),
      alternativeIndex: null,
      whyAlternativeWorse: null,
    };
    expect(parseAdvice(advice, 2)).toEqual(advice);
  });

  test("rejects a non-object value", () => {
    expect(parseAdvice("nope", 2)).toBeNull();
  });

  test("rejects an out-of-range recommendation index", () => {
    expect(
      parseAdvice({ ...adviceFixture(), recommendationIndex: 2 }, 2),
    ).toBeNull();
  });

  test("rejects a negative recommendation index", () => {
    expect(
      parseAdvice({ ...adviceFixture(), recommendationIndex: -1 }, 2),
    ).toBeNull();
  });

  test("rejects a fractional recommendation index", () => {
    expect(
      parseAdvice({ ...adviceFixture(), recommendationIndex: 0.5 }, 2),
    ).toBeNull();
  });

  test("rejects an out-of-range alternative index", () => {
    expect(
      parseAdvice({ ...adviceFixture(), alternativeIndex: 7 }, 2),
    ).toBeNull();
  });

  test("rejects a non-string explanation", () => {
    expect(parseAdvice({ ...adviceFixture(), explanation: 5 }, 2)).toBeNull();
  });

  test("rejects a missing concept", () => {
    expect(parseAdvice({ ...adviceFixture(), concept: undefined }, 2)).toBeNull();
  });
});
