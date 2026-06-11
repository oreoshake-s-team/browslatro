// @vitest-environment node
import {
  consumableCreationsOnHandPlayed,
  createJokerCatalog,
  createSeanceJoker,
} from "../jokers";

const baseCtx = {
  playedCards: [],
  scoredCards: [],
  isFirstHandOfRound: false,
  money: 10,
} as const;

describe("Séance", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("seance");
  });

  test("a Straight Flush creates a spectral", () => {
    const result = consumableCreationsOnHandPlayed([createSeanceJoker()], {
      ...baseCtx,
      playedHandLabel: "Straight Flush",
    });
    expect(result.spectrals).toBe(1);
  });

  test("a plain Flush creates nothing (negative)", () => {
    const result = consumableCreationsOnHandPlayed([createSeanceJoker()], {
      ...baseCtx,
      playedHandLabel: "Flush",
    });
    expect(result.spectrals).toBe(0);
  });
});
