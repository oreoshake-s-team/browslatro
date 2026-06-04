// @vitest-environment node
import {
  DELAYED_GRATIFICATION_MONEY_PER_DISCARD,
  applyEndOfRoundJokers,
  applyHandLevelJokers,
  applyPerCardJokers,
  createDelayedGratificationJoker,
} from "../jokers";
import type { JokerRarity } from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Delayed Gratification", () => {
  test("pays DELAYED_GRATIFICATION_MONEY_PER_DISCARD per remaining discard when no discards were used", () => {
    const result = applyEndOfRoundJokers([createDelayedGratificationJoker()], {
      remainingDiscards: 3,
      discardsUsedThisRound: 0,
    });
    expect(result.moneyEarned).toBe(DELAYED_GRATIFICATION_MONEY_PER_DISCARD * 3);
  });

  test("emits a single step crediting Delayed Gratification with the total", () => {
    const result = applyEndOfRoundJokers([createDelayedGratificationJoker()], {
      remainingDiscards: 2,
      discardsUsedThisRound: 0,
    });
    expect(result.steps).toEqual([
      {
        jokerId: "delayed-gratification",
        jokerName: "Delayed Gratification",
        moneyEarned: DELAYED_GRATIFICATION_MONEY_PER_DISCARD * 2,
      },
    ]);
  });

  test("treats missing discardsUsedThisRound as zero (defaults to firing)", () => {
    const result = applyEndOfRoundJokers([createDelayedGratificationJoker()], {
      remainingDiscards: 1,
    });
    expect(result.moneyEarned).toBe(DELAYED_GRATIFICATION_MONEY_PER_DISCARD);
  });

  test("pays nothing once any discard has been used this round (negative)", () => {
    const result = applyEndOfRoundJokers([createDelayedGratificationJoker()], {
      remainingDiscards: 3,
      discardsUsedThisRound: 1,
    });
    expect(result.moneyEarned).toBe(0);
  });

  test("emits no step once any discard has been used this round (negative)", () => {
    const result = applyEndOfRoundJokers([createDelayedGratificationJoker()], {
      remainingDiscards: 3,
      discardsUsedThisRound: 1,
    });
    expect(result.steps).toEqual([]);
  });

  test("stays gated even when many discards have been used (negative)", () => {
    const result = applyEndOfRoundJokers([createDelayedGratificationJoker()], {
      remainingDiscards: 2,
      discardsUsedThisRound: 5,
    });
    expect(result.moneyEarned).toBe(0);
  });

  test("pays nothing when no discards remain", () => {
    const result = applyEndOfRoundJokers([createDelayedGratificationJoker()], {
      remainingDiscards: 0,
      discardsUsedThisRound: 0,
    });
    expect(result.moneyEarned).toBe(0);
  });

  test("emits no step when no discards remain", () => {
    const result = applyEndOfRoundJokers([createDelayedGratificationJoker()], {
      remainingDiscards: 0,
      discardsUsedThisRound: 0,
    });
    expect(result.steps).toEqual([]);
  });

  test("pays nothing when remainingDiscards is missing from context", () => {
    const result = applyEndOfRoundJokers([createDelayedGratificationJoker()], {});
    expect(result.moneyEarned).toBe(0);
  });

  test("clamps a negative remainingDiscards value to zero", () => {
    const result = applyEndOfRoundJokers([createDelayedGratificationJoker()], {
      remainingDiscards: -3,
      discardsUsedThisRound: 0,
    });
    expect(result.moneyEarned).toBe(0);
  });

  test("does not contribute in the hand-level pass", () => {
    const result = applyHandLevelJokers([createDelayedGratificationJoker()], {
      remainingDiscards: 3,
    });
    expect(result.firedJokerIds).toEqual([]);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers(
      [createDelayedGratificationJoker()],
      card("K"),
    );
    expect(result.firedJokerIds).toEqual([]);
  });

  test("is a common joker", () => {
    expect(createDelayedGratificationJoker().rarity).toBe<JokerRarity>(
      "common",
    );
  });
});
