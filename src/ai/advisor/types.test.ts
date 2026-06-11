// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  adviceRequestFixture,
  candidatesFixture,
  modelStateFixture,
} from "./test-helpers";
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

describe("parseAdviceRequest hardening", () => {
  test("rejects a hand larger than the cap", () => {
    const state = {
      ...modelStateFixture(),
      hand: Array.from({ length: 17 }, (_, index) => ({
        ...modelStateFixture().hand[0],
        id: index + 1,
      })),
    };
    expect(
      parseAdviceRequest({ state, candidates: candidatesFixture() }),
    ).toBeNull();
  });

  test("rejects more jokers than the cap", () => {
    const state = {
      ...modelStateFixture(),
      jokers: Array.from({ length: 17 }, () => ({})),
    };
    expect(
      parseAdviceRequest({ state, candidates: candidatesFixture() }),
    ).toBeNull();
  });

  test("rejects a blind without a numeric score target", () => {
    const state = {
      ...modelStateFixture(),
      blind: { ...modelStateFixture().blind, scoreTarget: "300" },
    };
    expect(
      parseAdviceRequest({ state, candidates: candidatesFixture() }),
    ).toBeNull();
  });

  test("rejects non-finite money", () => {
    const state = { ...modelStateFixture(), money: Number.POSITIVE_INFINITY };
    expect(
      parseAdviceRequest({ state, candidates: candidatesFixture() }),
    ).toBeNull();
  });

  test("rejects a candidate with more cards than a legal play", () => {
    const candidates = [
      { ...candidatesFixture()[0], cardIds: [1, 2, 3, 4, 5, 6] },
    ];
    expect(
      parseAdviceRequest({ ...adviceRequestFixture(), candidates }),
    ).toBeNull();
  });

  test("rejects a play candidate without scoring fields", () => {
    const candidates = [
      { action: "play", cardIds: [1, 2], handLabel: "Pair" },
    ];
    expect(
      parseAdviceRequest({ ...adviceRequestFixture(), candidates }),
    ).toBeNull();
  });
});
