// @vitest-environment node
import {
  HOLOGRAM_X_MULT_PER_ADDED_CARD,
  applyHandLevelJokers,
  createHologramJoker,
  createJokerCatalog,
} from "../jokers";

describe("Hologram (#868)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("hologram");
  });

  test("one added card gives X1.25 Mult", () => {
    const result = applyHandLevelJokers([createHologramJoker()], {
      playedHandLabel: "Pair",
      addedCardsCount: 1,
    });
    expect(result.xMult).toBe(1 + HOLOGRAM_X_MULT_PER_ADDED_CARD);
  });

  test("four added cards give X2 Mult", () => {
    const result = applyHandLevelJokers([createHologramJoker()], {
      playedHandLabel: "Pair",
      addedCardsCount: 4,
    });
    expect(result.xMult).toBe(1 + 4 * HOLOGRAM_X_MULT_PER_ADDED_CARD);
  });

  test("does not fire with no added cards (negative)", () => {
    const result = applyHandLevelJokers([createHologramJoker()], {
      playedHandLabel: "Pair",
      addedCardsCount: 0,
    });
    expect(result.xMult).toBe(1);
  });

  test("does not fire when addedCardsCount is not provided (negative)", () => {
    const result = applyHandLevelJokers([createHologramJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.xMult).toBe(1);
  });
});
