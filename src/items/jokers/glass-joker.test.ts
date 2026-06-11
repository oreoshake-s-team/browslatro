// @vitest-environment node
import {
  GLASS_JOKER_X_MULT_PER_SHATTER,
  applyGlassShatterToJokerStates,
  applyHandLevelJokers,
  createGlassJoker,
  createJokerCatalog,
} from "../jokers";

describe("Glass Joker", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("glass-joker");
  });

  test("one shattered glass card gives X1.75 Mult", () => {
    const jokers = applyGlassShatterToJokerStates([createGlassJoker()], 1);
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "Pair" });
    expect(result.xMult).toBe(1 + GLASS_JOKER_X_MULT_PER_SHATTER);
  });

  test("shatters accumulate", () => {
    const jokers = applyGlassShatterToJokerStates(
      applyGlassShatterToJokerStates([createGlassJoker()], 1),
      2,
    );
    expect(jokers[0].state).toEqual({ kind: "counter", value: 3 });
  });

  test("a zero-shatter call leaves the counter unchanged (negative)", () => {
    const jokers = applyGlassShatterToJokerStates([createGlassJoker()], 0);
    expect(jokers[0].state).toEqual({ kind: "counter", value: 0 });
  });

  test("contributes nothing before any shatter (negative)", () => {
    const result = applyHandLevelJokers([createGlassJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.xMult).toBe(1);
  });

  test("shatters do not touch other jokers' states (negative)", () => {
    const other = createJokerCatalog().find((j) => j.id === "green-joker");
    if (!other) throw new Error("green-joker missing from catalog");
    const [updated] = applyGlassShatterToJokerStates([other], 2);
    expect(updated.state).toEqual(other.state);
  });
});
