// @vitest-environment node
import { describe, expect, test } from "vitest";
import { adviceRequestFixture, candidatesFixture } from "./test-helpers";
import { MAX_CANDIDATES, parseAdviceRequest } from "./types";

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
