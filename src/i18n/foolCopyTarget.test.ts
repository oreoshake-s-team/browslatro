// @vitest-environment node
import type { TFunction } from "i18next";
import { appendFoolHint, foolCopyTargetText, FOOL_ID } from "./foolCopyTarget";
import { createPlanetCatalog } from "../items/planets";
import { createTarotCatalog } from "../items/tarots";

const fakeT = ((key: string, opts?: Record<string, unknown>) =>
  opts ? `${key}:${JSON.stringify(opts)}` : key) as unknown as TFunction;

describe("appendFoolHint", () => {
  test("appends the hint for The Fool", () => {
    expect(appendFoolHint("base", FOOL_ID, "hint")).toBe("base — hint");
  });

  test("leaves a non-Fool description unchanged (negative)", () => {
    expect(appendFoolHint("base", "the-hermit", "hint")).toBe("base");
  });

  test("leaves the description unchanged when there is no hint (negative)", () => {
    expect(appendFoolHint("base", FOOL_ID, undefined)).toBe("base");
  });
});

describe("foolCopyTargetText", () => {
  test("returns the none message when nothing has been used", () => {
    expect(foolCopyTargetText(fakeT, "en", null)).toBe(
      "consumables.foolCopyNone",
    );
  });

  test("labels a planet target with the planet kind", () => {
    const planet = { kind: "planet" as const, card: createPlanetCatalog()[0] };
    expect(foolCopyTargetText(fakeT, "en", planet)).toContain("shop.kindPlanet");
  });

  test("labels a tarot target with the tarot kind", () => {
    const tarot = { kind: "tarot" as const, card: createTarotCatalog()[0] };
    expect(foolCopyTargetText(fakeT, "en", tarot)).toContain("shop.kindTarot");
  });
});
