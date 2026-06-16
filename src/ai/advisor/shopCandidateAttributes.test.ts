import { describe, expect, test } from "vitest";
import {
  SHOP_ATTRIBUTE_FEATURES,
  ZERO_SHOP_ATTRIBUTES,
  shopItemAttributes,
} from "./shopCandidateAttributes";
import { createJokerCatalog, type Joker } from "../../items/jokers";
import { createPlanetCatalog } from "../../items/planets";
import { createTarotCatalog } from "../../items/tarots";
import type { ShopItem } from "../../items/shop";

const JOKERS = createJokerCatalog();
const PLANETS = createPlanetCatalog();
const TAROTS = createTarotCatalog();

const RARITY_INDEX = SHOP_ATTRIBUTE_FEATURES - 4;
const CHIPS_DELTA_INDEX = SHOP_ATTRIBUTE_FEATURES - 6;
const MULT_DELTA_INDEX = SHOP_ATTRIBUTE_FEATURES - 5;

function jokerItem(joker: Joker): ShopItem {
  return { kind: "joker", joker, price: 4, sold: false };
}

describe("shopItemAttributes", () => {
  test("returns a fixed-width vector for a joker", () => {
    expect(shopItemAttributes(jokerItem(JOKERS[0])).length).toBe(
      SHOP_ATTRIBUTE_FEATURES,
    );
  });

  test("ZERO_SHOP_ATTRIBUTES is the zero vector of the right width", () => {
    expect(ZERO_SHOP_ATTRIBUTES).toEqual(
      new Array(SHOP_ATTRIBUTE_FEATURES).fill(0),
    );
  });

  test("rarer jokers encode a higher rarity attribute than common jokers", () => {
    const common = JOKERS.find((j) => j.rarity === "common");
    const rare = JOKERS.find((j) => j.rarity === "rare");
    if (!common || !rare) throw new Error("catalog missing rarities");
    expect(shopItemAttributes(jokerItem(rare))[RARITY_INDEX]).toBeGreaterThan(
      shopItemAttributes(jokerItem(common))[RARITY_INDEX],
    );
  });

  test("planets encode their chip and mult deltas", () => {
    const attrs = shopItemAttributes({ kind: "planet", planet: PLANETS[0], price: 3, sold: false });
    expect(attrs[CHIPS_DELTA_INDEX] + attrs[MULT_DELTA_INDEX]).toBeGreaterThan(0);
  });

  test("jokers leave the planet-only chipsDelta slot at zero", () => {
    expect(shopItemAttributes(jokerItem(JOKERS[0]))[CHIPS_DELTA_INDEX]).toBe(0);
  });

  test("tarots with selection targets encode a non-zero targets attribute", () => {
    const enhance = TAROTS.find((t) => t.effect.kind === "apply-enhancement");
    if (!enhance) throw new Error("catalog missing apply-enhancement tarot");
    const attrs = shopItemAttributes({ kind: "tarot", tarot: enhance, price: 3, sold: false });
    expect(attrs.some((v) => v > 0)).toBe(true);
  });
});
