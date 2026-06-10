// @vitest-environment node
import {
  consumableCreationsOnHandPlayed,
  createEightBallJoker,
  createJokerCatalog,
} from "../jokers";
import type { Card } from "../../cards/types";

const eight: Card = { id: 1, rank: "8", suit: "clubs" };
const seven: Card = { id: 2, rank: "7", suit: "clubs" };

const baseCtx = {
  playedHandLabel: "Pair",
  playedCards: [eight, seven],
  isFirstHandOfRound: false,
  money: 10,
} as const;

describe("8 Ball (#1019)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("8-ball");
  });

  test("a scored 8 creates a tarot when the roll hits", () => {
    const result = consumableCreationsOnHandPlayed([createEightBallJoker()], {
      ...baseCtx,
      scoredCards: [eight],
      rng: () => 0,
    });
    expect(result.tarots).toBe(1);
  });

  test("a missed roll creates nothing (negative)", () => {
    const result = consumableCreationsOnHandPlayed([createEightBallJoker()], {
      ...baseCtx,
      scoredCards: [eight],
      rng: () => 0.99,
    });
    expect(result.tarots).toBe(0);
  });

  test("non-8 cards never roll (negative)", () => {
    const result = consumableCreationsOnHandPlayed([createEightBallJoker()], {
      ...baseCtx,
      scoredCards: [seven],
      rng: () => 0,
    });
    expect(result.tarots).toBe(0);
  });

  test("retriggered 8s roll once per scoring copy", () => {
    const result = consumableCreationsOnHandPlayed([createEightBallJoker()], {
      ...baseCtx,
      scoredCards: [eight, eight],
      rng: () => 0,
    });
    expect(result.tarots).toBe(2);
  });
});
