// @vitest-environment node
import { describe, expect, test } from "vitest";
import type { Card } from "../../cards/types";
import { createPlusFourMultJoker } from "../../items/jokers/factories";
import type { PackOffer } from "../../items/packs";
import { createPlanetCatalog } from "../../items/planets";
import type { ShopItem } from "../../items/shop";
import {
  consumableRefs,
  jokerRefs,
  packAdviceOption,
  playingCardDescribed,
  shopAdviceItem,
  voucherAdviceItem,
} from "./contextSnapshots";

function cardFixture(overrides: Partial<Card> = {}): Card {
  return { id: 7, rank: "9", suit: "hearts", ...overrides };
}

function jokerOffer(): ShopItem {
  return { kind: "joker", joker: createPlusFourMultJoker(), price: 5, sold: false };
}

function packOffer(): PackOffer {
  const planet = createPlanetCatalog()[0];
  return {
    pool: "celestial",
    variant: "normal",
    options: [{ kind: "planet", planet }],
  };
}

describe("shopAdviceItem", () => {
  test("maps a joker offer with its description and discounted cost", () => {
    const joker = createPlusFourMultJoker();
    expect(shopAdviceItem(jokerOffer(), 4)).toEqual({
      itemType: "joker",
      category: "joker-mult",
      attributes: expect.any(Array),
      id: joker.id,
      name: joker.name,
      description: joker.description,
      cost: 4,
    });
  });

  test("maps a planet offer to the planet item type", () => {
    const planet = createPlanetCatalog()[0];
    const item = shopAdviceItem(
      { kind: "planet", planet, price: 3, sold: false },
      3,
    );
    expect(item.itemType).toBe("planet");
  });

  test("describes a plain playing card without traits", () => {
    const item = shopAdviceItem(
      { kind: "playing-card", card: cardFixture(), price: 1, sold: false },
      1,
    );
    expect(item.description).toBe("Adds this playing card to your deck");
  });

  test("describes an enhanced playing card with its traits", () => {
    const item = shopAdviceItem(
      {
        kind: "playing-card",
        card: cardFixture({ enhancement: "gold", seal: "red" }),
        price: 1,
        sold: false,
      },
      1,
    );
    expect(item.description).toBe(
      "Adds this playing card to your deck (gold enhancement, red seal)",
    );
  });

  test("describes a pack offer with its pick and option counts", () => {
    const item = shopAdviceItem(
      { kind: "pack", pack: packOffer(), price: 4, sold: false },
      4,
    );
    expect(item.description).toBe("Opens to pick 1 of 1 options");
  });
});

describe("voucherAdviceItem", () => {
  test("maps a voucher to the voucher item type with its cost", () => {
    const item = voucherAdviceItem(
      { id: "overstock", name: "Overstock", description: "+1 card slot in shop" },
      10,
    );
    expect(item).toEqual({
      itemType: "voucher",
      category: "other",
      attributes: expect.any(Array),
      id: "overstock",
      name: "Overstock",
      description: "+1 card slot in shop",
      cost: 10,
    });
  });
});

describe("packAdviceOption", () => {
  test("maps a joker option with its description", () => {
    const joker = createPlusFourMultJoker();
    expect(packAdviceOption({ kind: "joker", joker })).toEqual({
      optionType: "joker",
      category: "joker-mult",
      attributes: expect.any(Array),
      id: joker.id,
      name: joker.name,
      description: joker.description,
    });
  });

  test("maps a playing-card option with its traits", () => {
    const option = packAdviceOption({
      kind: "playing-card",
      card: cardFixture({ edition: "foil" }),
    });
    expect(option.description).toBe(
      "Adds this playing card to your deck (foil edition)",
    );
  });
});

describe("playingCardDescribed", () => {
  test("names the card by rank and suit", () => {
    expect(playingCardDescribed(cardFixture()).name).toBe("9 of hearts");
  });
});

describe("jokerRefs", () => {
  test("maps held jokers to id and name pairs", () => {
    const joker = createPlusFourMultJoker();
    expect(jokerRefs([joker])).toEqual([{ id: joker.id, name: joker.name }]);
  });
});

describe("consumableRefs", () => {
  test("maps held consumables to id and name pairs", () => {
    const planet = createPlanetCatalog()[0];
    expect(consumableRefs([{ kind: "planet", card: planet }])).toEqual([
      { id: planet.id, name: planet.name },
    ]);
  });
});
