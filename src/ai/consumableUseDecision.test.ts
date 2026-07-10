// @vitest-environment node
import { describe, expect, test } from "vitest";
import { consumableUseDecision } from "./consumableUseDecision";
import type { Consumable } from "../items/consumables";
import { createPlanetCatalog } from "../items/planets";
import { createTarotCatalog } from "../items/tarots";
import type { ShopItem } from "../items/shop";
import { joker } from "./test-helpers";

const PLANETS = createPlanetCatalog();
const TAROTS = createTarotCatalog();

const jokerOffer: ShopItem = { kind: "joker", joker: joker({ id: "j1" }), price: 5, sold: false };
const heldTarot: Consumable = { kind: "tarot", card: TAROTS[0] };
const heldPlanet: Consumable = { kind: "planet", card: PLANETS[0] };

describe("consumableUseDecision", () => {
  test("outside the shop the candidate set is uses plus leave", () => {
    const decision = consumableUseDecision(
      { shopOffers: null, consumables: [heldTarot, heldPlanet] },
      1,
    );
    expect(decision?.candidates.map((c) => (c.isUse ? "u" : c.isLeave ? "l" : "b"))).toEqual([
      "u",
      "u",
      "l",
    ]);
  });

  test("outside the shop the chosen index points at the used consumable", () => {
    const decision = consumableUseDecision(
      { shopOffers: null, consumables: [heldTarot, heldPlanet] },
      1,
    );
    expect(decision?.chosenIndex).toBe(1);
  });

  test("in the shop offers precede the use candidates and shift the chosen index", () => {
    const decision = consumableUseDecision(
      { shopOffers: [jokerOffer], consumables: [heldTarot] },
      0,
    );
    expect(decision?.chosenIndex).toBe(1);
  });

  test("in the shop the offers are snapshotted", () => {
    const decision = consumableUseDecision(
      { shopOffers: [jokerOffer], consumables: [heldTarot] },
      0,
    );
    expect(decision?.offers.map((o) => o.id)).toEqual(["j1"]);
  });

  test("the item snapshot describes the used consumable", () => {
    const decision = consumableUseDecision(
      { shopOffers: null, consumables: [heldTarot] },
      0,
    );
    expect(decision?.item.itemType).toBe("tarot");
  });

  test("records how many consumables were held", () => {
    const decision = consumableUseDecision(
      { shopOffers: null, consumables: [heldTarot, heldPlanet] },
      0,
    );
    expect(decision?.consumablesHeld).toBe(2);
  });

  test("returns null for an out-of-range index (negative)", () => {
    const decision = consumableUseDecision(
      { shopOffers: null, consumables: [heldTarot] },
      3,
    );
    expect(decision).toBeNull();
  });
});
