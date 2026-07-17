import { describe, expect, test } from "vitest";
import { createPlanetCatalog } from "../items/planets";
import { en } from "./locales/en";

const names: Record<string, string> = en.planetNames;
const descriptions: Record<string, string> = en.planetDescriptions;

describe("planet i18n coverage", () => {
  test("every catalog planet has an en name", () => {
    const missing = createPlanetCatalog()
      .filter((planet) => names[planet.id] === undefined)
      .map((planet) => planet.id);
    expect(missing).toEqual([]);
  });

  test("every catalog planet has an en description", () => {
    const missing = createPlanetCatalog()
      .filter((planet) => descriptions[planet.id] === undefined)
      .map((planet) => planet.id);
    expect(missing).toEqual([]);
  });

  test("every en planet description matches the catalog's generated description", () => {
    const mismatched = createPlanetCatalog()
      .filter((planet) => descriptions[planet.id] !== planet.description)
      .map((planet) => planet.id);
    expect(mismatched).toEqual([]);
  });
});
