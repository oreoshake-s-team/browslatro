// @vitest-environment node
import { describe, expect, test } from "vitest";
import { buildHeadlessDeck, seededRng, type ShopView } from "./headlessRun";
import { createJokerStackingShopAgent, offerBuildValue } from "./rolloutShopAgent";
import { jokerEffectCategory } from "./encode";
import { joker } from "./test-helpers";
import { createJokerCatalog } from "../items/jokers";
import { createPlanetCatalog } from "../items/planets";
import { createTarotCatalog } from "../items/tarots";
import { MAX_JOKERS } from "../items/jokers/constants";
import { createDefaultHandStats } from "../scoring/handStats";
import type { Joker } from "../items/jokers/types";
import type { ShopItem } from "../items/shop";

const CATALOG = createJokerCatalog();
const xMultJoker = CATALOG.find((j) => jokerEffectCategory(j.effect.kind) === "x-mult")!;
const moneyJoker = CATALOG.find((j) => jokerEffectCategory(j.effect.kind) === "money")!;
const planetOffer: ShopItem = { kind: "planet", planet: createPlanetCatalog()[0], price: 3, sold: false };
const tarotOffer: ShopItem = { kind: "tarot", tarot: createTarotCatalog()[0], price: 3, sold: false };

function jokerOffer(j: Joker): ShopItem {
  return { kind: "joker", joker: j, price: 6, sold: false };
}

function view(overrides: Partial<ShopView> = {}): ShopView {
  return {
    ante: 2,
    round: 3,
    money: 100,
    jokers: [],
    handStats: createDefaultHandStats(),
    deck: buildHeadlessDeck(),
    ownedVoucherIds: new Set(),
    lastConsumable: null,
    rng: seededRng(17),
    ...overrides,
  };
}

describe("createJokerStackingShopAgent", () => {
  test("acquires jokers when money and slots allow", async () => {
    const agent = createJokerStackingShopAgent();
    const result = await agent.buyAfterRound(view());
    expect(result.jokers.length).toBeGreaterThan(0);
  });

  test("spends money on the jokers it buys", async () => {
    const agent = createJokerStackingShopAgent();
    const result = await agent.buyAfterRound(view({ money: 100 }));
    expect(result.money).toBeLessThan(100);
  });

  test("buys no additional jokers when the joker slots are already full (negative)", async () => {
    const full: Joker[] = Array.from({ length: MAX_JOKERS }, (_, i) => joker({ id: `owned-${i}` }));
    const agent = createJokerStackingShopAgent();
    const result = await agent.buyAfterRound(view({ jokers: full }));
    expect(result.jokers.length).toBe(MAX_JOKERS);
  });

  test("buys nothing when there is no money (negative)", async () => {
    const agent = createJokerStackingShopAgent();
    const result = await agent.buyAfterRound(view({ money: 0 }));
    expect(result.jokers.length).toBe(0);
  });
});

describe("offerBuildValue", () => {
  test("ranks x-mult jokers above planets", () => {
    expect(offerBuildValue(jokerOffer(xMultJoker))).toBeGreaterThan(offerBuildValue(planetOffer));
  });

  test("ranks planets above tarots", () => {
    expect(offerBuildValue(planetOffer)).toBeGreaterThan(offerBuildValue(tarotOffer));
  });

  test("ranks x-mult jokers above money jokers", () => {
    expect(offerBuildValue(jokerOffer(xMultJoker))).toBeGreaterThan(offerBuildValue(jokerOffer(moneyJoker)));
  });
});
