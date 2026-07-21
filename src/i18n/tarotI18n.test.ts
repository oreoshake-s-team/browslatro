import { describe, expect, test } from "vitest";
import { createTarotCatalog } from "../items/tarots";
import { en } from "./locales/en";

const names: Record<string, string> = en.tarotNames;
const descriptions: Record<string, string> = en.tarotDescriptions;

describe("tarot i18n coverage", () => {
  test("every catalog tarot has an en name", () => {
    const missing = createTarotCatalog()
      .filter((tarot) => names[tarot.id] === undefined)
      .map((tarot) => tarot.id);
    expect(missing).toEqual([]);
  });

  test("every catalog tarot has an en description", () => {
    const missing = createTarotCatalog()
      .filter((tarot) => descriptions[tarot.id] === undefined)
      .map((tarot) => tarot.id);
    expect(missing).toEqual([]);
  });

  test("every en tarot description matches the catalog's generated description", () => {
    const mismatched = createTarotCatalog()
      .filter((tarot) => descriptions[tarot.id] !== tarot.description)
      .map((tarot) => tarot.id);
    expect(mismatched).toEqual([]);
  });

  test("every en tarot name matches the catalog's literal name", () => {
    const mismatched = createTarotCatalog()
      .filter((tarot) => names[tarot.id] !== tarot.name)
      .map((tarot) => tarot.id);
    expect(mismatched).toEqual([]);
  });
});
