// @vitest-environment node
import { describe, expect, test } from "vitest";
import { chosenCandidateIndex, shopCandidateRows } from "./shopCandidateRows";
import { joker } from "../src/ai/test-helpers";
import type { Consumable } from "../src/items/consumables";
import { createPlanetCatalog } from "../src/items/planets";
import { createTarotCatalog } from "../src/items/tarots";
import type { ShopItem } from "../src/items/shop";

const PLANETS = createPlanetCatalog();
const TAROTS = createTarotCatalog();

const jokerOffer: ShopItem = { kind: "joker", joker: joker({ id: "j1" }), price: 5, sold: false };
const planetOffer: ShopItem = { kind: "planet", planet: PLANETS[0], price: 3, sold: false };
const heldTarot: Consumable = { kind: "tarot", card: TAROTS[0] };
const heldPlanet: Consumable = { kind: "planet", card: PLANETS[0] };

describe("shopCandidateRows", () => {
  test("orders offers, uses, reroll, then leave", () => {
    const rows = shopCandidateRows([jokerOffer, planetOffer], [heldTarot], 5);
    expect(rows.map((r) => `${r.isUse ? "u" : r.isReroll ? "r" : r.isLeave ? "l" : "b"}`)).toEqual([
      "b",
      "b",
      "u",
      "r",
      "l",
    ]);
  });

  test("use rows carry the consumable's item type", () => {
    const rows = shopCandidateRows([], [heldTarot, heldPlanet], null);
    expect(rows.slice(0, 2).map((r) => r.itemType)).toEqual(["tarot", "planet"]);
  });

  test("use rows cost nothing", () => {
    const rows = shopCandidateRows([], [heldTarot], null);
    expect(rows[0].cost).toBe(0);
  });

  test("the reroll row carries the reroll cost", () => {
    const rows = shopCandidateRows([jokerOffer], [], 7);
    expect(rows[1]).toEqual({ itemType: "", category: "other", cost: 7, isReroll: true, isLeave: false, isUse: false });
  });

  test("omits the reroll row when reroll is unavailable (negative)", () => {
    const rows = shopCandidateRows([jokerOffer], [heldTarot], null);
    expect(rows.some((r) => r.isReroll)).toBe(false);
  });

  test("always ends with a leave row", () => {
    const rows = shopCandidateRows([], [], null);
    expect(rows[rows.length - 1].isLeave).toBe(true);
  });
});

describe("chosenCandidateIndex", () => {
  test("buy maps to the offer index", () => {
    expect(chosenCandidateIndex(3, 2, true, { kind: "buy", index: 1 })).toBe(1);
  });

  test("use maps past the offers", () => {
    expect(chosenCandidateIndex(3, 2, true, { kind: "use", index: 1 })).toBe(4);
  });

  test("reroll maps past offers and uses", () => {
    expect(chosenCandidateIndex(3, 2, true, { kind: "reroll" })).toBe(5);
  });

  test("leave maps last when reroll is present", () => {
    expect(chosenCandidateIndex(3, 2, true, { kind: "leave" })).toBe(6);
  });

  test("leave maps last when reroll is absent", () => {
    expect(chosenCandidateIndex(3, 2, false, { kind: "leave" })).toBe(5);
  });
});
