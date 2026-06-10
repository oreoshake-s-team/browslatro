import {
  HAW_JOKER_OVERRIDES,
  localizedJokerDescription,
  localizedJokerName,
} from "./jokerOverrides";
import {
  createJokerCatalog,
  createLegendaryJokerCatalog,
} from "../items/jokers";

describe("jokerOverrides", () => {
  test("localizedJokerName returns the fallback when no override exists", () => {
    expect(localizedJokerName("haw", "abstract-joker", "Abstract Joker")).toBe(
      "Abstract Joker",
    );
  });

  test("localizedJokerName returns the fallback under en (negative)", () => {
    expect(localizedJokerName("en", "abstract-joker", "Abstract Joker")).toBe(
      "Abstract Joker",
    );
  });

  test("localizedJokerDescription returns the fallback when no override exists", () => {
    expect(localizedJokerDescription("haw", "egg", "Gains sell value")).toBe(
      "Gains sell value",
    );
  });

  test("every haw joker override id exists in a joker catalog", () => {
    const known = new Set(
      [...createJokerCatalog(), ...createLegendaryJokerCatalog()].map(
        (j) => j.id,
      ),
    );
    const unknown = Object.keys(HAW_JOKER_OVERRIDES).filter(
      (id) => !known.has(id),
    );
    expect(unknown).toEqual([]);
  });
});
