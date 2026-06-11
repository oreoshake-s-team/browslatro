// @vitest-environment node
import {
  SATELLITE_MONEY_PER_PLANET,
  applyEndOfRoundJokers,
  createJokerCatalog,
  createSatelliteJoker,
} from "../jokers";

describe("Satellite", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("satellite");
  });

  test("pays $1 per unique planet used", () => {
    const result = applyEndOfRoundJokers([createSatelliteJoker()], {
      uniquePlanetsUsed: 3,
    });
    expect(result.moneyEarned).toBe(3 * SATELLITE_MONEY_PER_PLANET);
  });

  test("pays nothing before any planet is used (negative)", () => {
    const result = applyEndOfRoundJokers([createSatelliteJoker()], {
      uniquePlanetsUsed: 0,
    });
    expect(result.moneyEarned).toBe(0);
  });

  test("pays nothing when the count is not provided (negative)", () => {
    const result = applyEndOfRoundJokers([createSatelliteJoker()]);
    expect(result.moneyEarned).toBe(0);
  });
});
