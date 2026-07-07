// @vitest-environment node
import {
  calculateInterest,
  countGoldHeldInHand,
  goldHeldBonus,
  roundBlindReward,
  GOLD_HELD_BONUS_PER_CARD,
  INTEREST_CAP,
  INTEREST_RATE_PER,
} from "./payout";
import type { Card } from "../cards/types";

function card(id: number, enhancement?: "gold"): Card {
  return enhancement
    ? { id, rank: "5", suit: "spades", enhancement }
    : { id, rank: "5", suit: "spades" };
}

describe("calculateInterest", () => {
  test("returns 0 when wallet is empty", () => {
    expect(calculateInterest(0)).toBe(0);
  });

  test("returns 0 when wallet is below the per-interest threshold", () => {
    expect(calculateInterest(INTEREST_RATE_PER - 1)).toBe(0);
  });

  test("pays $1 for each full INTEREST_RATE_PER held under the cap", () => {
    expect(calculateInterest(INTEREST_RATE_PER * 3)).toBe(3);
  });

  test.each([
    { wallet: 5, expected: 1 },
    { wallet: 10, expected: 2 },
    { wallet: 15, expected: 3 },
    { wallet: 20, expected: 4 },
    { wallet: 9, expected: 1 },
    { wallet: 14, expected: 2 },
  ])(
    "earns $$$expected of interest at $$$wallet wallet",
    ({ wallet, expected }) => {
      expect(calculateInterest(wallet)).toBe(expected);
    },
  );

  test("pays exactly INTEREST_CAP when wallet equals the cap threshold", () => {
    expect(calculateInterest(INTEREST_RATE_PER * INTEREST_CAP)).toBe(
      INTEREST_CAP,
    );
  });

  test("caps interest at INTEREST_CAP when wallet exceeds the cap threshold", () => {
    expect(calculateInterest(INTEREST_RATE_PER * INTEREST_CAP + 100)).toBe(
      INTEREST_CAP,
    );
  });

  test("treats a negative wallet as 0 interest", () => {
    expect(calculateInterest(-10)).toBe(0);
  });

  test("would inflate interest if a caller folded end-of-round joker money into the wallet", () => {
    const walletBeforeEorJokers = 9;
    const cloud9Income = 1;
    const inflated = calculateInterest(walletBeforeEorJokers + cloud9Income);
    const correct = calculateInterest(walletBeforeEorJokers);
    expect(inflated - correct).toBe(1);
  });
});

describe("roundBlindReward", () => {
  test("pays blind + 2 for a normal win", () => {
    expect(
      roundBlindReward({
        blind: 2,
        smallBlindSkipped: false,
        savedByMrBones: false,
      }),
    ).toBe(4);
  });

  test("pays nothing when the red stake skips the small blind reward", () => {
    expect(
      roundBlindReward({
        blind: 1,
        smallBlindSkipped: true,
        savedByMrBones: false,
      }),
    ).toBe(0);
  });

  test("pays nothing when Mr. Bones saved the round", () => {
    expect(
      roundBlindReward({
        blind: 3,
        smallBlindSkipped: false,
        savedByMrBones: true,
      }),
    ).toBe(0);
  });
});

describe("countGoldHeldInHand", () => {
  test("returns 0 for a hand with no gold cards", () => {
    expect(countGoldHeldInHand([card(1), card(2)], new Set())).toBe(0);
  });

  test("counts each gold card that is not in the submitted set", () => {
    const hand = [card(1, "gold"), card(2, "gold"), card(3)];
    expect(countGoldHeldInHand(hand, new Set())).toBe(2);
  });

  test("excludes gold cards that are in the submitted set", () => {
    const hand = [card(1, "gold"), card(2, "gold"), card(3, "gold")];
    expect(countGoldHeldInHand(hand, new Set([2]))).toBe(2);
  });

  test("returns 0 when every gold card was submitted", () => {
    const hand = [card(1, "gold"), card(2, "gold")];
    expect(countGoldHeldInHand(hand, new Set([1, 2]))).toBe(0);
  });
});

describe("goldHeldBonus", () => {
  test("returns 0 when no gold is held", () => {
    expect(goldHeldBonus([card(1)], new Set())).toBe(0);
  });

  test("returns $3 for one held gold card", () => {
    expect(goldHeldBonus([card(1, "gold")], new Set())).toBe(3);
  });

  test("multiplies by GOLD_HELD_BONUS_PER_CARD across the held gold count", () => {
    const hand = [card(1, "gold"), card(2, "gold"), card(3, "gold")];
    expect(goldHeldBonus(hand, new Set())).toBe(3 * GOLD_HELD_BONUS_PER_CARD);
  });
});
