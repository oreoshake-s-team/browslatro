// @vitest-environment node
import {
  createPlusFourMultJoker,
} from "../jokers";
import { applyJokersToScoring } from "./scoring/scoring.test-helpers";

describe("applyJokersToScoring — +4 Mult joker", () => {
  test("adds 4 to the additive mult", () => {
    const result = applyJokersToScoring([createPlusFourMultJoker()], []);
    expect(result.additiveMult).toBe(4);
  });

  test("does not change xMult", () => {
    const result = applyJokersToScoring([createPlusFourMultJoker()], []);
    expect(result.xMult).toBe(1);
  });

  test("does not award any money", () => {
    const result = applyJokersToScoring([createPlusFourMultJoker()], []);
    expect(result.moneyEarned).toBe(0);
  });
});
