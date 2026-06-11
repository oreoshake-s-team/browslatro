// @vitest-environment node
import {
  GOLDEN_JOKER_MONEY,
  applyEndOfRoundJokers,
  applyHandLevelJokers,
  applyPerCardJokers,
  createBlueprintJoker,
  createBrainstormJoker,
  createGoldenJoker,
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

describe("Golden Joker", () => {
  test("earns GOLDEN_JOKER_MONEY at end of round", () => {
    const result = applyEndOfRoundJokers([createGoldenJoker()]);
    expect(result.moneyEarned).toBe(GOLDEN_JOKER_MONEY);
  });

  test("emits a single end-of-round step with the joker name and amount", () => {
    const result = applyEndOfRoundJokers([createGoldenJoker()]);
    expect(result.steps).toEqual([
      {
        jokerId: "golden-joker",
        jokerName: "Golden Joker",
        moneyEarned: GOLDEN_JOKER_MONEY,
      },
    ]);
  });

  test("ignores remainingDiscards (always pays flat)", () => {
    const result = applyEndOfRoundJokers([createGoldenJoker()], {
      remainingDiscards: 0,
    });
    expect(result.moneyEarned).toBe(GOLDEN_JOKER_MONEY);
  });

  test("does not contribute in the hand-level pass", () => {
    const result = applyHandLevelJokers([createGoldenJoker()]);
    expect(result.firedJokerIds).toEqual([]);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers([createGoldenJoker()], card("K"));
    expect(result.firedJokerIds).toEqual([]);
  });

  test("is a common joker", () => {
    expect(createGoldenJoker().rarity).toBe<JokerRarity>("common");
  });

  test("Blueprint copying Golden Joker doubles the end-of-round payout", () => {
    const result = applyEndOfRoundJokers([createBlueprintJoker(), createGoldenJoker()]);
    expect(result.moneyEarned).toBe(GOLDEN_JOKER_MONEY * 2);
  });

  test("Brainstorm copying Golden Joker doubles the end-of-round payout", () => {
    const result = applyEndOfRoundJokers([createGoldenJoker(), createBrainstormJoker()]);
    expect(result.moneyEarned).toBe(GOLDEN_JOKER_MONEY * 2);
  });

  test("Blueprint with no right neighbor contributes nothing (negative)", () => {
    const result = applyEndOfRoundJokers([createGoldenJoker(), createBlueprintJoker()]);
    expect(result.moneyEarned).toBe(GOLDEN_JOKER_MONEY);
  });
});
