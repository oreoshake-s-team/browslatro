// @vitest-environment node
import {
  RAMEN_X_MULT,
  RAMEN_X_MULT_LOSS_PER_CARD,
  applyDiscardToJokerStates,
  applyHandLevelJokers,
  createJokerCatalog,
  createRamenJoker,
} from "../jokers";
import type { Joker } from "../jokers";

describe("Ramen (#871)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("ramen");
  });

  test("applies its full X2 Mult before any discard", () => {
    const result = applyHandLevelJokers([createRamenJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.xMult).toBe(RAMEN_X_MULT);
  });

  test("discarding 3 cards drops the factor to X1.97", () => {
    const jokers = applyDiscardToJokerStates([createRamenJoker()], 3);
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "Pair" });
    expect(result.xMult).toBe(RAMEN_X_MULT - 3 * RAMEN_X_MULT_LOSS_PER_CARD);
  });

  test("discards accumulate across separate discard actions", () => {
    const jokers = applyDiscardToJokerStates(
      applyDiscardToJokerStates([createRamenJoker()], 2),
      2,
    );
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "Pair" });
    expect(result.xMult).toBe(RAMEN_X_MULT - 4 * RAMEN_X_MULT_LOSS_PER_CARD);
  });

  test("is destroyed when the factor reaches X1", () => {
    const cardsToDeplete = Math.round(
      (RAMEN_X_MULT - 1) / RAMEN_X_MULT_LOSS_PER_CARD,
    );
    const jokers = applyDiscardToJokerStates(
      [createRamenJoker()],
      cardsToDeplete,
    );
    expect(jokers).toHaveLength(0);
  });

  test("survives one card short of depletion (negative)", () => {
    const cardsToDeplete = Math.round(
      (RAMEN_X_MULT - 1) / RAMEN_X_MULT_LOSS_PER_CARD,
    );
    const jokers = applyDiscardToJokerStates(
      [createRamenJoker()],
      cardsToDeplete - 1,
    );
    expect(jokers).toHaveLength(1);
  });

  test("an eternal Ramen is not destroyed at X1", () => {
    const eternal: Joker = {
      ...createRamenJoker(),
      stickers: [{ kind: "eternal" }],
    };
    const cardsToDeplete = Math.round(
      (RAMEN_X_MULT - 1) / RAMEN_X_MULT_LOSS_PER_CARD,
    );
    expect(applyDiscardToJokerStates([eternal], cardsToDeplete)).toHaveLength(1);
  });

  test("a discard action with 0 cards leaves the factor unchanged (negative)", () => {
    const jokers = applyDiscardToJokerStates([createRamenJoker()], 0);
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "Pair" });
    expect(result.xMult).toBe(RAMEN_X_MULT);
  });
});
