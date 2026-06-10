// @vitest-environment node
import {
  allowsDuplicateJokers,
  createJokerCatalog,
  createShowmanJoker,
} from "../jokers";

describe("Showman (#1033)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("showman");
  });

  test("allows duplicates when equipped", () => {
    expect(allowsDuplicateJokers([createShowmanJoker()])).toBe(true);
  });

  test("other jokers do not allow duplicates (negative)", () => {
    expect(allowsDuplicateJokers([createJokerCatalog()[0]])).toBe(false);
  });

  test("an empty row does not allow duplicates (negative)", () => {
    expect(allowsDuplicateJokers([])).toBe(false);
  });
});
