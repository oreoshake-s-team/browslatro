// @vitest-environment node
import {
  CONSTELLATION_X_MULT_PER_PLANET,
  applyConsumableUsedToJokerStates,
  applyHandLevelJokers,
  createConstellationJoker,
  createJokerCatalog,
} from "../jokers";
import type { Joker } from "../jokers";

function afterPlanets(count: number): Joker[] {
  let jokers: Joker[] = [createConstellationJoker()];
  for (let i = 0; i < count; i += 1) {
    jokers = applyConsumableUsedToJokerStates(jokers, "planet");
  }
  return jokers;
}

describe("Constellation", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("constellation");
  });

  test("one planet used gives X1.1 Mult", () => {
    const result = applyHandLevelJokers(afterPlanets(1), {
      playedHandLabel: "Pair",
    });
    expect(result.xMult).toBe(1 + CONSTELLATION_X_MULT_PER_PLANET);
  });

  test("five planets used give X1.5 Mult", () => {
    const result = applyHandLevelJokers(afterPlanets(5), {
      playedHandLabel: "Pair",
    });
    expect(result.xMult).toBe(1 + 5 * CONSTELLATION_X_MULT_PER_PLANET);
  });

  test("using a tarot does not grow the counter (negative)", () => {
    const [updated] = applyConsumableUsedToJokerStates(
      [createConstellationJoker()],
      "tarot",
    );
    expect(updated.state).toEqual({ kind: "counter", value: 0 });
  });

  test("contributes nothing before any planet is used (negative)", () => {
    const result = applyHandLevelJokers([createConstellationJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.xMult).toBe(1);
  });
});
