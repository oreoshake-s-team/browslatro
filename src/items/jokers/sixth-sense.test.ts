// @vitest-environment node
import {
  consumableCreationsOnHandPlayed,
  createJokerCatalog,
  createSixthSenseJoker,
} from "../jokers";
import type { Card } from "../../cards/types";

const six: Card = { id: 1, rank: "6", suit: "clubs" };
const seven: Card = { id: 2, rank: "7", suit: "clubs" };

const baseCtx = {
  playedHandLabel: "High Card",
  scoredCards: [six],
  money: 10,
} as const;

describe("Sixth Sense (#1019)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("sixth-sense");
  });

  test("a first-hand single 6 creates a spectral and destroys the 6", () => {
    const result = consumableCreationsOnHandPlayed([createSixthSenseJoker()], {
      ...baseCtx,
      playedCards: [six],
      isFirstHandOfRound: true,
    });
    expect(result.spectrals).toBe(1);
    expect(result.destroyedCardId).toBe(six.id);
  });

  test("a later hand does nothing (negative)", () => {
    const result = consumableCreationsOnHandPlayed([createSixthSenseJoker()], {
      ...baseCtx,
      playedCards: [six],
      isFirstHandOfRound: false,
    });
    expect(result.spectrals).toBe(0);
  });

  test("a single non-6 does nothing (negative)", () => {
    const result = consumableCreationsOnHandPlayed([createSixthSenseJoker()], {
      ...baseCtx,
      playedCards: [seven],
      isFirstHandOfRound: true,
    });
    expect(result.spectrals).toBe(0);
  });

  test("a 6 played with other cards does nothing (negative)", () => {
    const result = consumableCreationsOnHandPlayed([createSixthSenseJoker()], {
      ...baseCtx,
      playedCards: [six, seven],
      isFirstHandOfRound: true,
    });
    expect(result.spectrals).toBe(0);
  });
});
