// @vitest-environment node
import {
  createBusinessCardJoker,
  createChaosTheClownJoker,
  createJokerCatalog,
  hasChaosTheClownInJokers,
  type JokerRarity,
} from "../jokers";

describe("createChaosTheClownJoker", () => {
  test("has the Common rarity", () => {
    expect(createChaosTheClownJoker().rarity).toBe<JokerRarity>("common");
  });

  test("uses a passive-run-stats effect with chaosTheClown flag", () => {
    expect(createChaosTheClownJoker().effect).toEqual({
      kind: "passive-run-stats",
      chaosTheClown: true,
    });
  });

  test("description mentions free Reroll", () => {
    expect(createChaosTheClownJoker().description).toMatch(/free Reroll/i);
  });

  test("description mentions per shop", () => {
    expect(createChaosTheClownJoker().description).toMatch(/per shop/i);
  });

  test("uses the chaos-the-clown id", () => {
    expect(createChaosTheClownJoker().id).toBe("chaos-the-clown");
  });
});

describe("Chaos the Clown in the catalog", () => {
  test("is registered with its id", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("chaos-the-clown");
  });

  test("the catalog entry has the Common rarity", () => {
    const entry = createJokerCatalog().find((j) => j.id === "chaos-the-clown");
    expect(entry?.rarity).toBe<JokerRarity>("common");
  });
});

describe("hasChaosTheClownInJokers", () => {
  test("returns false on an empty slate (negative)", () => {
    expect(hasChaosTheClownInJokers([])).toBe(false);
  });

  test("returns false when Chaos the Clown is not present (negative)", () => {
    expect(hasChaosTheClownInJokers([createBusinessCardJoker()])).toBe(false);
  });

  test("returns true when Chaos the Clown is present", () => {
    expect(
      hasChaosTheClownInJokers([
        createBusinessCardJoker(),
        createChaosTheClownJoker(),
      ]),
    ).toBe(true);
  });
});
