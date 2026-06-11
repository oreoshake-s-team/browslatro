// @vitest-environment node
import {
  LUCKY_CAT_X_MULT_PER_TRIGGER,
  applyHandLevelJokers,
  applyLuckyTriggersToJokerStates,
  createJokerCatalog,
  createLuckyCatJoker,
} from "../jokers";

describe("Lucky Cat", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("lucky-cat");
  });

  test("one lucky trigger gives X1.25 Mult", () => {
    const jokers = applyLuckyTriggersToJokerStates([createLuckyCatJoker()], 1);
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "Pair" });
    expect(result.xMult).toBe(1 + LUCKY_CAT_X_MULT_PER_TRIGGER);
  });

  test("four lucky triggers give X2 Mult", () => {
    const jokers = applyLuckyTriggersToJokerStates([createLuckyCatJoker()], 4);
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "Pair" });
    expect(result.xMult).toBe(1 + 4 * LUCKY_CAT_X_MULT_PER_TRIGGER);
  });

  test("triggers accumulate across hands", () => {
    const jokers = applyLuckyTriggersToJokerStates(
      applyLuckyTriggersToJokerStates([createLuckyCatJoker()], 2),
      1,
    );
    expect(jokers[0].state).toEqual({ kind: "counter", value: 3 });
  });

  test("a zero-trigger hand leaves the counter unchanged (negative)", () => {
    const jokers = applyLuckyTriggersToJokerStates([createLuckyCatJoker()], 0);
    expect(jokers[0].state).toEqual({ kind: "counter", value: 0 });
  });

  test("contributes nothing before any trigger (negative)", () => {
    const result = applyHandLevelJokers([createLuckyCatJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.xMult).toBe(1);
  });

  test("lucky triggers do not touch other jokers' states (negative)", () => {
    const other = createJokerCatalog().find((j) => j.id === "red-card");
    if (!other) throw new Error("red-card missing from catalog");
    const [updated] = applyLuckyTriggersToJokerStates([other], 2);
    expect(updated.state).toEqual(other.state);
  });
});
