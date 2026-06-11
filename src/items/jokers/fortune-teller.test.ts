// @vitest-environment node
import {
  FORTUNE_TELLER_MULT_PER_TAROT,
  applyConsumableUsedToJokerStates,
  applyHandLevelJokers,
  createFortuneTellerJoker,
  createJokerCatalog,
} from "../jokers";

describe("Fortune Teller", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("fortune-teller");
  });

  test("using a tarot grows the counter by FORTUNE_TELLER_MULT_PER_TAROT", () => {
    const [updated] = applyConsumableUsedToJokerStates(
      [createFortuneTellerJoker()],
      "tarot",
    );
    expect(updated.state).toEqual({
      kind: "counter",
      value: FORTUNE_TELLER_MULT_PER_TAROT,
    });
  });

  test("scoring adds the accumulated counter as additive mult", () => {
    const jokers = applyConsumableUsedToJokerStates(
      applyConsumableUsedToJokerStates([createFortuneTellerJoker()], "tarot"),
      "tarot",
    );
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "Pair" });
    expect(result.additiveMult).toBe(2 * FORTUNE_TELLER_MULT_PER_TAROT);
  });

  test("using a planet does not grow the counter (negative)", () => {
    const [updated] = applyConsumableUsedToJokerStates(
      [createFortuneTellerJoker()],
      "planet",
    );
    expect(updated.state).toEqual({ kind: "counter", value: 0 });
  });

  test("using a spectral does not grow the counter (negative)", () => {
    const [updated] = applyConsumableUsedToJokerStates(
      [createFortuneTellerJoker()],
      "spectral",
    );
    expect(updated.state).toEqual({ kind: "counter", value: 0 });
  });

  test("contributes no mult before any tarot is used (negative)", () => {
    const result = applyHandLevelJokers([createFortuneTellerJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.additiveMult).toBe(0);
  });
});
