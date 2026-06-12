import { describe, expect, test } from "vitest";
import {
  encodePackCandidates,
  encodeShopCandidates,
  SHOP_INPUT_FEATURES,
} from "./shopEncoding";
import type { PackRankInput, ShopRankInput } from "./shopEncoding";
import type { PackAdviceCandidate, ShopAdviceCandidate } from "./types";

function buyCandidate(): ShopAdviceCandidate {
  return {
    action: "buy",
    item: {
      id: "j_jolly",
      name: "Jolly Joker",
      itemType: "joker",
      cost: 4,
      description: "test",
    },
  };
}

function rerollCandidate(): ShopAdviceCandidate {
  return { action: "reroll", cost: 5 };
}

function leaveCandidate(): ShopAdviceCandidate {
  return { action: "leave" };
}

function pickCandidate(): PackAdviceCandidate {
  return {
    action: "pick",
    option: { id: "c_star", name: "The Star", optionType: "tarot", description: "test" },
  };
}

function skipCandidate(): PackAdviceCandidate {
  return { action: "skip" };
}

describe("SHOP_INPUT_FEATURES", () => {
  test("equals 16", () => {
    expect(SHOP_INPUT_FEATURES).toBe(16);
  });
});

describe("encodeShopCandidates", () => {
  test("produces a row of SHOP_INPUT_FEATURES per candidate", () => {
    const input: ShopRankInput = {
      money: 10,
      ante: 2,
      round: 3,
      candidates: [buyCandidate(), rerollCandidate(), leaveCandidate()],
    };
    const encoded = encodeShopCandidates(input);
    expect(encoded.length).toBe(3 * SHOP_INPUT_FEATURES);
  });

  test("encodes context features in the first 4 values", () => {
    const input: ShopRankInput = {
      money: 20,
      ante: 8,
      round: 24,
      candidates: [buyCandidate()],
    };
    const encoded = encodeShopCandidates(input);
    expect(encoded[0]).toBeCloseTo(1.0);
    expect(encoded[1]).toBeCloseTo(1.0);
    expect(encoded[2]).toBeCloseTo(1.0);
    expect(encoded[3]).toBeCloseTo(0.0);
  });

  test("sets can_afford=1 when money >= cost", () => {
    const candidate: ShopAdviceCandidate = {
      action: "buy",
      item: { id: "j", name: "J", itemType: "joker", cost: 4, description: "d" },
    };
    const input: ShopRankInput = { money: 10, ante: 1, round: 0, candidates: [candidate] };
    const encoded = encodeShopCandidates(input);
    const canAffordIndex = 4 + 7 + 1;
    expect(encoded[canAffordIndex]).toBe(1);
  });

  test("sets can_afford=0 when money < cost", () => {
    const candidate: ShopAdviceCandidate = {
      action: "buy",
      item: { id: "j", name: "J", itemType: "joker", cost: 20, description: "d" },
    };
    const input: ShopRankInput = { money: 5, ante: 1, round: 0, candidates: [candidate] };
    const encoded = encodeShopCandidates(input);
    const canAffordIndex = 4 + 7 + 1;
    expect(encoded[canAffordIndex]).toBe(0);
  });

  test("marks reroll candidate with is_reroll=1", () => {
    const input: ShopRankInput = {
      money: 10,
      ante: 1,
      round: 0,
      candidates: [rerollCandidate()],
    };
    const encoded = encodeShopCandidates(input);
    const isRerollIndex = 4 + 7 + 1 + 1;
    expect(encoded[isRerollIndex]).toBe(1);
  });

  test("marks leave candidate with is_leave=1", () => {
    const input: ShopRankInput = {
      money: 5,
      ante: 1,
      round: 0,
      candidates: [leaveCandidate()],
    };
    const encoded = encodeShopCandidates(input);
    const isLeaveIndex = 4 + 7 + 1 + 1 + 1;
    expect(encoded[isLeaveIndex]).toBe(1);
  });

  test("returns empty array for no candidates", () => {
    const input: ShopRankInput = { money: 5, ante: 1, round: 0, candidates: [] };
    expect(encodeShopCandidates(input).length).toBe(0);
  });
});

describe("encodePackCandidates", () => {
  test("produces a row of SHOP_INPUT_FEATURES per candidate", () => {
    const input: PackRankInput = {
      money: 10,
      ante: 2,
      round: 3,
      picksRemaining: 2,
      candidates: [pickCandidate(), skipCandidate()],
    };
    const encoded = encodePackCandidates(input);
    expect(encoded.length).toBe(2 * SHOP_INPUT_FEATURES);
  });

  test("encodes picksRemaining in context slot 4", () => {
    const input: PackRankInput = {
      money: 0,
      ante: 0,
      round: 0,
      picksRemaining: 5,
      candidates: [pickCandidate()],
    };
    const encoded = encodePackCandidates(input);
    expect(encoded[3]).toBeCloseTo(1.0);
  });

  test("marks skip candidate with is_skip=1", () => {
    const input: PackRankInput = {
      money: 5,
      ante: 1,
      round: 0,
      picksRemaining: 1,
      candidates: [skipCandidate()],
    };
    const encoded = encodePackCandidates(input);
    const isSkipIndex = 4 + 7 + 1 + 1 + 1 + 1;
    expect(encoded[isSkipIndex]).toBe(1);
  });
});
