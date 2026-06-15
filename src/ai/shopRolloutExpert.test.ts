// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  applyOfferToState,
  bestShopChoice,
  type ConsumableLabelDeps,
  type PostShopState,
  type RolloutOptions,
} from "./shopRolloutExpert";
import { createGreedyAgent } from "./agents";
import { buildHeadlessDeck } from "./headlessRun";
import { joker } from "./test-helpers";
import { createDefaultHandStats, type HandStats } from "../scoring/handStats";
import { createJokerCatalog } from "../items/jokers/catalog";
import { MAX_JOKERS } from "../items/jokers/constants";
import { createPlanetCatalog } from "../items/planets";
import { createTarotCatalog, type TarotCard } from "../items/tarots";
import type { ShopItem } from "../items/shop";
import type { Joker } from "../items/jokers/types";

const powerJoker: Joker = joker({
  id: "power-joker",
  effect: { kind: "additive-mult", amount: 100000 },
});

const TAROTS = createTarotCatalog();
const CONSUMABLE_DEPS: ConsumableLabelDeps = {
  jokerCatalog: createJokerCatalog().filter((j) => j.rarity !== "legendary"),
  planetCatalog: createPlanetCatalog(),
  tarotCatalog: TAROTS,
  deck: buildHeadlessDeck(),
};

function tarotCard(id: string): TarotCard {
  const found = TAROTS.find((t) => t.id === id);
  if (found === undefined) throw new Error(`unknown tarot ${id}`);
  return found;
}

function jokerOffer(j: Joker, price: number): ShopItem {
  return { kind: "joker", joker: j, price, sold: false };
}

function tarotOffer(id: string, price: number): ShopItem {
  return { kind: "tarot", tarot: tarotCard(id), price, sold: false };
}

const totalLevels = (s: HandStats): number =>
  Object.values(s).reduce((sum, entry) => sum + entry.level, 0);
const BASELINE_LEVELS = totalLevels(createDefaultHandStats());

function baseState(overrides?: Partial<PostShopState>): PostShopState {
  return {
    jokers: [],
    money: 20,
    handStats: createDefaultHandStats(),
    ...overrides,
  };
}

describe("applyOfferToState", () => {
  test("returns null when the offer is unaffordable", () => {
    expect(applyOfferToState(jokerOffer(powerJoker, 99), baseState({ money: 5 }))).toBeNull();
  });

  test("returns null when joker slots are full", () => {
    const full = Array.from({ length: MAX_JOKERS }, (_, i) =>
      joker({ id: `j${i}` }),
    );
    expect(
      applyOfferToState(jokerOffer(powerJoker, 4), baseState({ jokers: full })),
    ).toBeNull();
  });

  test("appends the bought joker and deducts the price", () => {
    const next = applyOfferToState(jokerOffer(powerJoker, 6), baseState({ money: 10 }));
    expect(next).toEqual({
      jokers: [powerJoker],
      money: 4,
      handStats: createDefaultHandStats(),
    });
  });

  test("a tarot offer is skipped when no consumable deps are provided (negative)", () => {
    expect(applyOfferToState(tarotOffer("the-high-priestess", 4), baseState())).toBeNull();
  });

  test("The High Priestess upgrades hand levels via its created planets", () => {
    const next = applyOfferToState(tarotOffer("the-high-priestess", 4), baseState(), CONSUMABLE_DEPS, () => 0);
    expect(totalLevels(next?.handStats ?? createDefaultHandStats())).toBeGreaterThan(BASELINE_LEVELS);
  });

  test("Judgement adds a created joker", () => {
    const next = applyOfferToState(tarotOffer("judgement", 4), baseState(), CONSUMABLE_DEPS, () => 0);
    expect(next?.jokers.length).toBe(1);
  });

  test("an unaffordable tarot returns null (negative)", () => {
    expect(applyOfferToState(tarotOffer("judgement", 99), baseState({ money: 5 }), CONSUMABLE_DEPS, () => 0)).toBeNull();
  });
});

describe("bestShopChoice", () => {
  const opts: RolloutOptions = {
    agent: createGreedyAgent(),
    horizonAntes: 2,
    rollouts: 1,
    maxAnte: 8,
  };

  test("prefers a strong joker over leaving the shop", async () => {
    const offers = [jokerOffer(powerJoker, 4)];
    const choice = await bestShopChoice(1, offers, baseState(), opts, 100);
    expect(choice.index).toBe(0);
  });

  test("leaves when the only offer is unaffordable (negative)", async () => {
    const offers = [jokerOffer(powerJoker, 999)];
    const choice = await bestShopChoice(1, offers, baseState({ money: 3 }), opts, 200);
    expect(choice.index).toBe(offers.length);
  });
});
