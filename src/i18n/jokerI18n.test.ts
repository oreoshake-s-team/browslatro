import { describe, expect, test } from "vitest";
import { createJokerCatalog } from "../items/jokers/catalog";
import { en } from "./locales/en";

const names: Record<string, string> = en.jokerNames;
const descriptions: Record<string, string> = en.jokerDescriptions;

describe("joker i18n coverage", () => {
  test("every catalog joker has an en name", () => {
    const missing = createJokerCatalog()
      .filter((joker) => names[joker.id] === undefined)
      .map((joker) => joker.id);
    expect(missing).toEqual([]);
  });

  test("every catalog joker has an en description", () => {
    const missing = createJokerCatalog()
      .filter((joker) => descriptions[joker.id] === undefined)
      .map((joker) => joker.id);
    expect(missing).toEqual([]);
  });
});
