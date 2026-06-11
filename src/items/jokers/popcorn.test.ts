// @vitest-environment node
import {
  POPCORN_MULT,
  POPCORN_MULT_LOSS_PER_ROUND,
  applyHandLevelJokers,
  applyRoundEndToJokerStates,
  createJokerCatalog,
  createPopcornJoker,
} from "../jokers";
import type { Joker } from "../jokers";

function afterRounds(joker: Joker, rounds: number): Joker[] {
  let jokers: Joker[] = [joker];
  for (let i = 0; i < rounds; i += 1) {
    jokers = applyRoundEndToJokerStates(jokers, () => 0.99);
  }
  return jokers;
}

describe("Popcorn", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("popcorn");
  });

  test("starts at full mult", () => {
    expect(createPopcornJoker().state).toEqual({
      kind: "counter",
      value: POPCORN_MULT,
    });
  });

  test("contributes its current mult when scoring", () => {
    const result = applyHandLevelJokers([createPopcornJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.additiveMult).toBe(POPCORN_MULT);
  });

  test("loses mult at the end of each round", () => {
    const [updated] = afterRounds(createPopcornJoker(), 1);
    expect(updated.state).toEqual({
      kind: "counter",
      value: POPCORN_MULT - POPCORN_MULT_LOSS_PER_ROUND,
    });
  });

  test("is destroyed when the mult reaches 0", () => {
    const rounds = POPCORN_MULT / POPCORN_MULT_LOSS_PER_ROUND;
    expect(afterRounds(createPopcornJoker(), rounds)).toHaveLength(0);
  });

  test("survives the round before it would deplete (negative)", () => {
    const rounds = POPCORN_MULT / POPCORN_MULT_LOSS_PER_ROUND - 1;
    expect(afterRounds(createPopcornJoker(), rounds)).toHaveLength(1);
  });

  test("an eternal Popcorn is not destroyed at 0 mult", () => {
    const eternal: Joker = {
      ...createPopcornJoker(),
      stickers: [{ kind: "eternal" }],
    };
    const rounds = POPCORN_MULT / POPCORN_MULT_LOSS_PER_ROUND;
    expect(afterRounds(eternal, rounds)).toHaveLength(1);
  });

  test("round end does not touch unrelated jokers (negative)", () => {
    const other = createJokerCatalog().find((j) => j.id === "green-joker");
    if (!other) throw new Error("green-joker missing from catalog");
    const [updated] = applyRoundEndToJokerStates([other], () => 0.99);
    expect(updated).toEqual(other);
  });
});
