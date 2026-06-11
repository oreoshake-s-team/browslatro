// @vitest-environment node
import {
  createChicotJoker,
  createJokerCatalog,
  createLegendaryJokerCatalog,
  disablesBossBlindsFromJokers,
} from "../jokers";

describe("Chicot", () => {
  test("is in the legendary pool", () => {
    const ids = createLegendaryJokerCatalog().map((j) => j.id);
    expect(ids).toContain("chicot");
  });

  test("is not in the regular catalog (negative)", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).not.toContain("chicot");
  });

  test("disables boss blinds when equipped", () => {
    expect(disablesBossBlindsFromJokers([createChicotJoker()])).toBe(true);
  });

  test("other jokers do not disable boss blinds (negative)", () => {
    expect(disablesBossBlindsFromJokers([createJokerCatalog()[0]])).toBe(
      false,
    );
  });
});
