// @vitest-environment node
import { describe, expect, test } from "vitest";
import { applyShopAction, type ShopSearchState } from "./shopTransition";
import { EMPTY_SHOP_BUILD } from "./shopEncoding";
import type { ShopAdviceCandidate } from "./types";
import {
  applyPlanetUpgrade,
  createPlanetCatalog,
} from "../../items/planets";
import { createDefaultHandStats } from "../../scoring/handStats";

function state(overrides: Partial<ShopSearchState["build"]> = {}, money = 10): ShopSearchState {
  return { build: { ...EMPTY_SHOP_BUILD, ...overrides }, money };
}

function buyJoker(category = "joker-x-mult", cost = 6, rarityOrdinal = 0.5): ShopAdviceCandidate {
  const attributes = new Array<number>(18).fill(0);
  attributes[14] = rarityOrdinal;
  return {
    action: "buy",
    item: { itemType: "joker", category, attributes, id: "j", name: "J", description: "", cost },
  };
}

function planetUseCandidate(advancesHands: ReadonlyArray<string>): ShopAdviceCandidate {
  return {
    action: "use",
    item: { itemType: "planet", category: "planet", advancesHands, id: "p", name: "P", description: "", cost: 0 },
  };
}

describe("applyShopAction", () => {
  test("buying a joker deducts money and adds the joker by category and rarity", () => {
    const next = applyShopAction(state(), buyJoker("joker-x-mult", 6, 0.5));
    expect(next).toEqual({
      build: { ...EMPTY_SHOP_BUILD, jokers: [{ effectKind: "x-mult", rarity: "uncommon" }] },
      money: 4,
    });
  });

  test("a joker buy at full joker slots is not modeled", () => {
    const full = state({
      jokers: Array.from({ length: 5 }, () => ({
        effectKind: "x-mult",
        rarity: "uncommon",
      })),
    });
    expect(applyShopAction(full, buyJoker("joker-mult", 6))).toBeNull();
  });

  test("an unaffordable buy is not modeled", () => {
    expect(applyShopAction(state({}, 3), buyJoker("joker-mult", 6))).toBeNull();
  });

  test("buying a consumable moves money into a held consumable", () => {
    const tarot: ShopAdviceCandidate = {
      action: "buy",
      item: { itemType: "tarot", category: "tarot-enhance", id: "t", name: "T", description: "", cost: 3 },
    };
    const next = applyShopAction(state(), tarot);
    expect(next).toEqual({
      build: { ...EMPTY_SHOP_BUILD, consumablesHeld: 1 },
      money: 7,
    });
  });

  test("using a planet levels every hand it advances and frees the slot", () => {
    const next = applyShopAction(
      state({ handLevels: { Pair: 3 }, consumablesHeld: 1 }),
      planetUseCandidate(["Straight Flush", "Royal Flush"]),
    );
    expect(next?.build.handLevels).toEqual({ Pair: 3, "Straight Flush": 2, "Royal Flush": 2 });
    expect(next?.build.consumablesHeld).toBe(0);
  });

  test("planet leveling agrees with the game engine's planet upgrade", () => {
    for (const planet of createPlanetCatalog()) {
      const searched = applyShopAction(
        state({ consumablesHeld: 1 }),
        planetUseCandidate(planet.hands),
      );
      const engine = applyPlanetUpgrade(createDefaultHandStats(), planet);
      for (const hand of planet.hands) {
        expect(searched?.build.handLevels[hand]).toBe(engine[hand].level);
      }
    }
  });

  test("selling a joker refunds its value and removes the matching joker", () => {
    const owned = state({ jokers: [{ effectKind: "x-mult", rarity: "uncommon" }] });
    const sell: ShopAdviceCandidate = {
      action: "sell",
      item: { itemType: "joker", category: "joker-x-mult", attributes: (() => { const a = new Array<number>(18).fill(0); a[14] = 0.5; return a; })(), id: "sell:j:0", name: "J", description: "", cost: -3 },
    };
    const next = applyShopAction(owned, sell);
    expect(next).toEqual({ build: { ...EMPTY_SHOP_BUILD, jokers: [] }, money: 13 });
  });

  test("selling a joker the build does not hold is not modeled", () => {
    const sell: ShopAdviceCandidate = {
      action: "sell",
      item: { itemType: "joker", category: "joker-mult", id: "sell:j:0", name: "J", description: "", cost: -3 },
    };
    expect(applyShopAction(state(), sell)).toBeNull();
  });

  test("leave is the identity", () => {
    const start = state({ consumablesHeld: 2 }, 8);
    expect(applyShopAction(start, { action: "leave" })).toBe(start);
  });

  test("reroll is a frontier action, not deterministically modeled", () => {
    expect(applyShopAction(state(), { action: "reroll", cost: 5 })).toBeNull();
  });

  test("using a non-planet consumable is not modeled", () => {
    const spectral: ShopAdviceCandidate = {
      action: "use",
      item: { itemType: "spectral", category: "spectral", id: "s", name: "S", description: "", cost: 0 },
    };
    expect(applyShopAction(state({ consumablesHeld: 1 }), spectral)).toBeNull();
  });

  test("does not mutate the input state", () => {
    const start = state({ handLevels: { Pair: 2 }, consumablesHeld: 1 });
    applyShopAction(start, planetUseCandidate(["Pair"]));
    expect(start.build.handLevels).toEqual({ Pair: 2 });
  });
});
