// @vitest-environment node
import {
  BULL_CHIPS_PER_DOLLAR,
  applyHandLevelJokers,
  createBullJoker,
} from "../jokers";

describe("Bull", () => {
  test("adds BULL_CHIPS_PER_DOLLAR per dollar held", () => {
    const result = applyHandLevelJokers([createBullJoker()], { money: 10 });
    expect(result.additiveChips).toBe(BULL_CHIPS_PER_DOLLAR * 10);
  });

  test("fires when the player has money", () => {
    const result = applyHandLevelJokers([createBullJoker()], { money: 1 });
    expect(result.firedJokerIds).toEqual(["bull"]);
  });

  test("contributes no chips when the player has no money", () => {
    const result = applyHandLevelJokers([createBullJoker()], { money: 0 });
    expect(result.additiveChips).toBe(0);
  });

  test("clamps to zero chips when the player is in debt", () => {
    const result = applyHandLevelJokers([createBullJoker()], { money: -5 });
    expect(result.additiveChips).toBe(0);
  });

  test("contributes no chips when money is missing from context", () => {
    const result = applyHandLevelJokers([createBullJoker()], {});
    expect(result.additiveChips).toBe(0);
  });
});
