// @vitest-environment node
import {
  MADNESS_X_MULT_PER_BLIND,
  applyHandLevelJokers,
  applyMadnessOnBlindSelect,
  createJokerCatalog,
  createMadnessJoker,
} from "../jokers";
import type { Joker } from "../jokers";

describe("Madness", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("madness");
  });

  test("a blind select grows the counter and the X Mult", () => {
    const jokers = applyMadnessOnBlindSelect([createMadnessJoker()], () => 0);
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "Pair" });
    expect(result.xMult).toBe(1 + MADNESS_X_MULT_PER_BLIND);
  });

  test("destroys a random other joker", () => {
    const other = createJokerCatalog()[0];
    const jokers = applyMadnessOnBlindSelect(
      [createMadnessJoker(), other],
      () => 0,
    );
    expect(jokers.map((j) => j.id)).toEqual(["madness"]);
  });

  test("never destroys itself when alone (negative)", () => {
    const jokers = applyMadnessOnBlindSelect([createMadnessJoker()], () => 0);
    expect(jokers).toHaveLength(1);
  });

  test("eternal jokers are safe (negative)", () => {
    const eternal: Joker = {
      ...createJokerCatalog()[0],
      stickers: [{ kind: "eternal" }],
    };
    const jokers = applyMadnessOnBlindSelect(
      [createMadnessJoker(), eternal],
      () => 0,
    );
    expect(jokers).toHaveLength(2);
  });

  test("no Madness equipped is a no-op (negative)", () => {
    const other = createJokerCatalog()[0];
    const jokers = applyMadnessOnBlindSelect([other], () => 0);
    expect(jokers).toHaveLength(1);
  });
});
