// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  adviceRequestFixture,
  candidatesFixture,
  modelStateFixture,
  packAdviceRequestFixture,
  packCandidatesFixture,
  packStateFixture,
  shopAdviceRequestFixture,
  shopCandidatesFixture,
  shopStateFixture,
} from "./test-helpers";
import { MAX_CANDIDATES, MAX_JOKERS, parseAdviceRequest } from "./types";

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

describe("parseAdviceRequest shop context", () => {
  test("accepts a valid shop request", () => {
    expect(parseAdviceRequest(shopAdviceRequestFixture())).not.toBeNull();
  });

  test("rejects an unknown context", () => {
    expect(
      parseAdviceRequest({ ...shopAdviceRequestFixture(), context: "casino" }),
    ).toBeNull();
  });

  test("rejects a shop request without shop state", () => {
    expect(
      parseAdviceRequest({
        context: "shop",
        candidates: shopCandidatesFixture(),
      }),
    ).toBeNull();
  });

  test("rejects fewer than two candidates", () => {
    expect(
      parseAdviceRequest({
        ...shopAdviceRequestFixture(),
        candidates: [{ action: "leave" }],
      }),
    ).toBeNull();
  });

  test("rejects a buy candidate without a description", () => {
    const [buy] = shopCandidatesFixture();
    if (buy.action !== "buy") throw new Error("expected a buy candidate");
    const { description: _description, ...item } = buy.item;
    expect(
      parseAdviceRequest({
        ...shopAdviceRequestFixture(),
        candidates: [{ action: "buy", item }, { action: "leave" }],
      }),
    ).toBeNull();
  });

  test("rejects a reroll candidate without a numeric cost", () => {
    expect(
      parseAdviceRequest({
        ...shopAdviceRequestFixture(),
        candidates: [{ action: "reroll", cost: "5" }, { action: "leave" }],
      }),
    ).toBeNull();
  });

  test("rejects a shop candidate with an unknown action", () => {
    expect(
      parseAdviceRequest({
        ...shopAdviceRequestFixture(),
        candidates: [{ action: "sell" }, { action: "leave" }],
      }),
    ).toBeNull();
  });

  test("rejects non-string voucher ids", () => {
    expect(
      parseAdviceRequest({
        ...shopAdviceRequestFixture(),
        shop: { ...shopStateFixture(), ownedVoucherIds: [3] },
      }),
    ).toBeNull();
  });

  test("rejects more held jokers than the cap", () => {
    const jokers = Array.from({ length: MAX_JOKERS + 1 }, (_, index) => ({
      id: `joker-${index}`,
      name: `Joker ${index}`,
    }));
    expect(
      parseAdviceRequest({
        ...shopAdviceRequestFixture(),
        shop: { ...shopStateFixture(), jokers },
      }),
    ).toBeNull();
  });

  test("rejects non-finite money", () => {
    expect(
      parseAdviceRequest({
        ...shopAdviceRequestFixture(),
        shop: { ...shopStateFixture(), money: Number.NaN },
      }),
    ).toBeNull();
  });
});

describe("parseAdviceRequest pack context", () => {
  test("accepts a valid pack request", () => {
    expect(parseAdviceRequest(packAdviceRequestFixture())).not.toBeNull();
  });

  test("rejects a pack request without pack state", () => {
    expect(
      parseAdviceRequest({
        context: "pack",
        candidates: packCandidatesFixture(),
      }),
    ).toBeNull();
  });

  test("rejects fewer than two candidates", () => {
    expect(
      parseAdviceRequest({
        ...packAdviceRequestFixture(),
        candidates: [{ action: "skip" }],
      }),
    ).toBeNull();
  });

  test("rejects a pick candidate without a description", () => {
    const [pick] = packCandidatesFixture();
    if (pick.action !== "pick") throw new Error("expected a pick candidate");
    const { description: _description, ...option } = pick.option;
    expect(
      parseAdviceRequest({
        ...packAdviceRequestFixture(),
        candidates: [{ action: "pick", option }, { action: "skip" }],
      }),
    ).toBeNull();
  });

  test("rejects a pack candidate with an unknown action", () => {
    expect(
      parseAdviceRequest({
        ...packAdviceRequestFixture(),
        candidates: [{ action: "reroll", cost: 5 }, { action: "skip" }],
      }),
    ).toBeNull();
  });

  test("rejects a non-string pool", () => {
    expect(
      parseAdviceRequest({
        ...packAdviceRequestFixture(),
        pack: { ...packStateFixture(), pool: 3 },
      }),
    ).toBeNull();
  });

  test("rejects non-finite picksRemaining", () => {
    expect(
      parseAdviceRequest({
        ...packAdviceRequestFixture(),
        pack: { ...packStateFixture(), picksRemaining: Number.NaN },
      }),
    ).toBeNull();
  });

  test("rejects more held jokers than the cap", () => {
    const jokers = Array.from({ length: MAX_JOKERS + 1 }, (_, index) => ({
      id: `joker-${index}`,
      name: `Joker ${index}`,
    }));
    expect(
      parseAdviceRequest({
        ...packAdviceRequestFixture(),
        pack: { ...packStateFixture(), jokers },
      }),
    ).toBeNull();
  });
});
