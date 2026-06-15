// @vitest-environment node
import { describe, expect, test } from "vitest";
import { createJokerCatalog } from "../../items/jokers/catalog";
import { createPlanetCatalog } from "../../items/planets";
import { createSpectralCatalog } from "../../items/spectrals";
import { createTarotCatalog } from "../../items/tarots";
import { joker } from "../test-helpers";
import { categorizePackOption, categorizeShopItem } from "./shopCategory";

const tarot = (id: string) => {
  const card = createTarotCatalog().find((t) => t.id === id);
  if (card === undefined) throw new Error(`unknown tarot ${id}`);
  return card;
};

describe("categorizeShopItem", () => {
  test("buckets a mult joker as joker-mult", () => {
    const j = joker({ effect: { kind: "additive-mult", amount: 8 } });
    expect(categorizeShopItem({ kind: "joker", joker: j, price: 4, sold: false })).toBe("joker-mult");
  });

  test("buckets The High Priestess as tarot-create", () => {
    expect(categorizeShopItem({ kind: "tarot", tarot: tarot("the-high-priestess"), price: 4, sold: false })).toBe("tarot-create");
  });

  test("buckets The Magician as tarot-enhance", () => {
    expect(categorizeShopItem({ kind: "tarot", tarot: tarot("the-magician"), price: 4, sold: false })).toBe("tarot-enhance");
  });

  test("buckets The Hermit as tarot-economy", () => {
    expect(categorizeShopItem({ kind: "tarot", tarot: tarot("the-hermit"), price: 4, sold: false })).toBe("tarot-economy");
  });

  test("buckets a planet as planet", () => {
    const planet = createPlanetCatalog()[0];
    expect(categorizeShopItem({ kind: "planet", planet, price: 3, sold: false })).toBe("planet");
  });

  test("buckets a spectral as spectral", () => {
    const spectral = createSpectralCatalog()[0];
    expect(categorizeShopItem({ kind: "spectral", spectral, price: 4, sold: false })).toBe("spectral");
  });

  test("buckets a non-effect joker that exists in the catalog", () => {
    const j = createJokerCatalog()[0];
    expect(categorizeShopItem({ kind: "joker", joker: j, price: 4, sold: false })).toMatch(/^joker-/);
  });
});

describe("categorizePackOption", () => {
  test("buckets a tarot pack option by its effect family", () => {
    expect(categorizePackOption({ kind: "tarot", tarot: tarot("the-magician") })).toBe("tarot-enhance");
  });

  test("buckets a planet pack option as planet (negative: not other)", () => {
    const planet = createPlanetCatalog()[0];
    expect(categorizePackOption({ kind: "planet", planet })).toBe("planet");
  });
});
