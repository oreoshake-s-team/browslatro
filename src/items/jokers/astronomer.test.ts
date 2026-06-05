// @vitest-environment node
import {
  createAstronomerJoker,
  createBusinessCardJoker,
  createJokerCatalog,
  hasAstronomerInJokers,
} from "../jokers";

describe("createAstronomerJoker", () => {
  test("has the Uncommon rarity", () => {
    expect(createAstronomerJoker().rarity).toBe("uncommon");
  });

  test("description mentions Celestial Packs", () => {
    expect(createAstronomerJoker().description).toMatch(/Celestial/i);
  });

  test("description mentions Planet cards", () => {
    expect(createAstronomerJoker().description).toMatch(/Planet/i);
  });

  test("description names the free pricing", () => {
    expect(createAstronomerJoker().description).toMatch(/free/i);
  });

  test("registered in the main joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("astronomer");
  });

  test("effect kind is passive-run-stats", () => {
    expect(createAstronomerJoker().effect.kind).toBe("passive-run-stats");
  });
});

describe("hasAstronomerInJokers", () => {
  test("returns false on an empty slate (negative)", () => {
    expect(hasAstronomerInJokers([])).toBe(false);
  });

  test("returns false when no Astronomer is present (negative)", () => {
    expect(hasAstronomerInJokers([createBusinessCardJoker()])).toBe(false);
  });

  test("returns true when Astronomer is present", () => {
    expect(
      hasAstronomerInJokers([createBusinessCardJoker(), createAstronomerJoker()]),
    ).toBe(true);
  });
});
