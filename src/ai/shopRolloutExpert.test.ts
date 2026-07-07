// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  applyOfferToState,
  bestHeldUse,
  bestShopChoice,
  bestShopChoiceHeld,
  buyOfferToHold,
  flushHeldConsumables,
  useHeldConsumable,
  type ConsumableLabelDeps,
  type PostShopState,
  type RolloutOptions,
} from "./shopRolloutExpert";
import type { Consumable } from "../items/consumables";
import { createGreedyAgent } from "./agents";
import { buildHeadlessDeck } from "./headlessRun";
import { createJokerStackingShopAgent } from "./rolloutShopAgent";
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
    deck: buildHeadlessDeck(),
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

  test("allows a Negative joker past full joker slots", () => {
    const full = Array.from({ length: MAX_JOKERS }, (_, i) =>
      joker({ id: `j${i}` }),
    );
    const negative = joker({ id: "neg", edition: "negative" });
    expect(
      applyOfferToState(jokerOffer(negative, 4), baseState({ jokers: full, money: 10 }))
        ?.jokers.length,
    ).toBe(MAX_JOKERS + 1);
  });

  test("appends the bought joker and deducts the price", () => {
    const next = applyOfferToState(jokerOffer(powerJoker, 6), baseState({ money: 10 }));
    expect(next).toEqual({
      jokers: [powerJoker],
      money: 4,
      handStats: createDefaultHandStats(),
      deck: buildHeadlessDeck(),
    });
  });

  test("a joker purchase leaves the deck unchanged (negative)", () => {
    const base = baseState({ money: 10 });
    const next = applyOfferToState(jokerOffer(powerJoker, 6), base);
    expect(next?.deck).toBe(base.deck);
  });

  test("The Magician applies its enhancement to the rolled-out deck", () => {
    const next = applyOfferToState(tarotOffer("the-magician", 4), baseState(), CONSUMABLE_DEPS, () => 0);
    expect(next?.deck.some((c) => c.enhancement === "lucky")).toBe(true);
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

  test("still prefers a strong joker when the rollout keeps shopping", async () => {
    const shoppingOpts: RolloutOptions = { ...opts, rolloutShopAgent: createJokerStackingShopAgent() };
    const offers = [jokerOffer(powerJoker, 4)];
    const choice = await bestShopChoice(1, offers, baseState(), shoppingOpts, 300);
    expect(choice.index).toBe(0);
  });
});

const PLANETS = createPlanetCatalog();

function planetConsumable(): Consumable {
  return { kind: "planet", card: PLANETS[0] };
}

function tarotConsumable(id: string): Consumable {
  return { kind: "tarot", card: tarotCard(id) };
}

function planetOffer(price: number): ShopItem {
  return { kind: "planet", planet: PLANETS[0], price, sold: false };
}

describe("buyOfferToHold", () => {
  test("holds a bought planet instead of applying it", () => {
    const next = buyOfferToHold(planetOffer(3), baseState(), CONSUMABLE_DEPS, () => 0);
    expect(next?.consumables).toEqual([planetConsumable()]);
  });

  test("a held planet does not upgrade hand levels yet (negative)", () => {
    const next = buyOfferToHold(planetOffer(3), baseState(), CONSUMABLE_DEPS, () => 0);
    expect(totalLevels(next?.handStats ?? createDefaultHandStats())).toBe(BASELINE_LEVELS);
  });

  test("deducts the price when holding", () => {
    const next = buyOfferToHold(planetOffer(3), baseState({ money: 10 }), CONSUMABLE_DEPS, () => 0);
    expect(next?.money).toBe(7);
  });

  test("applies immediately when consumable slots are full", () => {
    const full = baseState({ consumables: [tarotConsumable("the-fool"), tarotConsumable("the-fool")] });
    const next = buyOfferToHold(planetOffer(3), full, CONSUMABLE_DEPS, () => 0);
    expect(totalLevels(next?.handStats ?? createDefaultHandStats())).toBeGreaterThan(BASELINE_LEVELS);
  });

  test("keeps the held list unchanged when slots are full", () => {
    const full = baseState({ consumables: [tarotConsumable("the-fool"), tarotConsumable("the-fool")] });
    const next = buyOfferToHold(planetOffer(3), full, CONSUMABLE_DEPS, () => 0);
    expect(next?.consumables?.length).toBe(2);
  });

  test("buys jokers through the immediate path and preserves held consumables", () => {
    const holding = baseState({ consumables: [planetConsumable()] });
    const next = buyOfferToHold(jokerOffer(powerJoker, 4), holding, CONSUMABLE_DEPS, () => 0);
    expect(next?.consumables).toEqual([planetConsumable()]);
  });

  test("returns null when the offer is unaffordable (negative)", () => {
    expect(buyOfferToHold(planetOffer(99), baseState({ money: 3 }), CONSUMABLE_DEPS, () => 0)).toBeNull();
  });
});

describe("useHeldConsumable", () => {
  test("applies the held planet's hand upgrade", () => {
    const holding = baseState({ consumables: [planetConsumable()] });
    const next = useHeldConsumable(0, holding, CONSUMABLE_DEPS, () => 0);
    expect(totalLevels(next?.handStats ?? createDefaultHandStats())).toBeGreaterThan(BASELINE_LEVELS);
  });

  test("removes the used consumable from the held list", () => {
    const holding = baseState({ consumables: [planetConsumable(), tarotConsumable("the-fool")] });
    const next = useHeldConsumable(0, holding, CONSUMABLE_DEPS, () => 0);
    expect(next?.consumables).toEqual([tarotConsumable("the-fool")]);
  });

  test("The Magician held then used enhances the deck", () => {
    const holding = baseState({ consumables: [tarotConsumable("the-magician")] });
    const next = useHeldConsumable(0, holding, CONSUMABLE_DEPS, () => 0);
    expect(next?.deck.some((c) => c.enhancement === "lucky")).toBe(true);
  });

  test("returns null for an out-of-range index (negative)", () => {
    expect(useHeldConsumable(3, baseState({ consumables: [planetConsumable()] }), CONSUMABLE_DEPS, () => 0)).toBeNull();
  });
});

describe("bestShopChoiceHeld", () => {
  const opts: RolloutOptions = {
    agent: createGreedyAgent(),
    horizonAntes: 2,
    rollouts: 1,
    maxAnte: 8,
    consumableDeps: CONSUMABLE_DEPS,
  };

  test("prefers a strong joker over leaving the shop", async () => {
    const choice = await bestShopChoiceHeld(1, [jokerOffer(powerJoker, 4)], baseState(), opts, 100);
    expect(choice.bestOffer).toBe(0);
  });

  test("picks nothing when the only offer is unaffordable (negative)", async () => {
    const choice = await bestShopChoiceHeld(1, [jokerOffer(powerJoker, 999)], baseState({ money: 3 }), opts, 200);
    expect({ bestOffer: choice.bestOffer, bestUse: choice.bestUse }).toEqual({ bestOffer: -1, bestUse: -1 });
  });

  test("rejects options without consumable deps (negative)", async () => {
    const bare: RolloutOptions = { agent: createGreedyAgent(), horizonAntes: 2, rollouts: 1, maxAnte: 8 };
    await expect(bestShopChoiceHeld(1, [], baseState(), bare, 300)).rejects.toThrow();
  });
});

describe("bestHeldUse", () => {
  const opts: RolloutOptions = {
    agent: createGreedyAgent(),
    horizonAntes: 1,
    rollouts: 1,
    maxAnte: 8,
    consumableDeps: CONSUMABLE_DEPS,
  };

  test("returns an index within the held list", async () => {
    const holding = baseState({ consumables: [planetConsumable(), tarotConsumable("the-fool")] });
    const index = await bestHeldUse(1, holding, opts, 400);
    expect([0, 1]).toContain(index);
  });

  test("defaults to the first slot when nothing is held", async () => {
    expect(await bestHeldUse(1, baseState(), opts, 500)).toBe(0);
  });
});

describe("flushHeldConsumables", () => {
  test("applies every held consumable", () => {
    const holding = baseState({ consumables: [planetConsumable(), planetConsumable()] });
    const next = flushHeldConsumables(holding, CONSUMABLE_DEPS, () => 0);
    expect(totalLevels(next.handStats)).toBe(BASELINE_LEVELS + 2);
  });

  test("empties the held list", () => {
    const holding = baseState({ consumables: [planetConsumable(), tarotConsumable("the-fool")] });
    const next = flushHeldConsumables(holding, CONSUMABLE_DEPS, () => 0);
    expect(next.consumables).toEqual([]);
  });

  test("returns the state unchanged when nothing is held", () => {
    const base = baseState();
    expect(flushHeldConsumables(base, CONSUMABLE_DEPS, () => 0)).toBe(base);
  });
});
