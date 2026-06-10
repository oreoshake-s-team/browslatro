// @vitest-environment node
import {
  consumableCreationsOnHandPlayed,
  createJokerCatalog,
  createSuperpositionJoker,
} from "../jokers";
import type { Card } from "../../cards/types";

const ace: Card = { id: 1, rank: "A", suit: "clubs" };
const king: Card = { id: 2, rank: "K", suit: "clubs" };

const baseCtx = {
  playedCards: [],
  isFirstHandOfRound: false,
  money: 10,
} as const;

describe("Superposition (#1019)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("superposition");
  });

  test("a Straight containing an Ace creates a tarot", () => {
    const result = consumableCreationsOnHandPlayed(
      [createSuperpositionJoker()],
      { ...baseCtx, playedHandLabel: "Straight", scoredCards: [ace] },
    );
    expect(result.tarots).toBe(1);
  });

  test("a Straight without an Ace creates nothing (negative)", () => {
    const result = consumableCreationsOnHandPlayed(
      [createSuperpositionJoker()],
      { ...baseCtx, playedHandLabel: "Straight", scoredCards: [king] },
    );
    expect(result.tarots).toBe(0);
  });

  test("an Ace outside a Straight creates nothing (negative)", () => {
    const result = consumableCreationsOnHandPlayed(
      [createSuperpositionJoker()],
      { ...baseCtx, playedHandLabel: "Pair", scoredCards: [ace] },
    );
    expect(result.tarots).toBe(0);
  });

  test("a Straight Flush with an Ace still counts", () => {
    const result = consumableCreationsOnHandPlayed(
      [createSuperpositionJoker()],
      { ...baseCtx, playedHandLabel: "Straight Flush", scoredCards: [ace] },
    );
    expect(result.tarots).toBe(1);
  });
});
