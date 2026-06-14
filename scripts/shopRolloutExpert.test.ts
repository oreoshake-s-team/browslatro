// @vitest-environment node
import { describe, expect, test } from "vitest";
import { getHandOptions } from "../src/ai/getHandOptions";
import type { HeadlessAgent, HeadlessRoundView } from "../src/ai/headlessRun";
import { joker } from "../src/ai/test-helpers";
import type { Joker } from "../src/items/jokers/types";
import { createPlanetCatalog } from "../src/items/planets";
import type { ShopItem } from "../src/items/shop";
import { createDefaultHandStats } from "../src/scoring/handStats";
import {
  applyShopBuy,
  labelByRollout,
  pickBestState,
  scoreShopState,
  type ShopForwardState,
} from "./shopRolloutExpert";

function jokerItem(j: Joker, price: number): ShopItem {
  return { kind: "joker", joker: j, price, sold: false };
}

const greedy: HeadlessAgent = {
  name: "greedy",
  chooseAction(view: HeadlessRoundView) {
    const best = getHandOptions(view, 1).find((o) => o.action === "play");
    if (best !== undefined) return { kind: "play", cardIds: best.cardIds };
    if (view.remainingDiscards > 0) {
      return { kind: "discard", cardIds: [view.dealt.hand[0].id] };
    }
    return { kind: "play", cardIds: [view.dealt.hand[0].id] };
  },
};

const powerJoker: Joker = joker({
  effect: { kind: "additive-mult", amount: 100000 },
});

function state(overrides: Partial<ShopForwardState> = {}): ShopForwardState {
  return {
    ante: 1,
    jokers: [],
    handStats: createDefaultHandStats(),
    money: 4,
    ...overrides,
  };
}

describe("scoreShopState", () => {
  test("a carry joker clears the full round budget", async () => {
    const score = await scoreShopState(
      state({ jokers: [powerJoker] }),
      greedy,
      [1, 2],
      3,
    );
    expect(score).toBe(3);
  });

  test("a stronger loadout scores at least as high as a weaker one", async () => {
    const seeds = [1, 2, 3];
    const strong = await scoreShopState(state({ jokers: [powerJoker] }), greedy, seeds, 4);
    const weak = await scoreShopState(state({ jokers: [] }), greedy, seeds, 4);
    expect(strong).toBeGreaterThanOrEqual(weak);
  });

  test("is deterministic for the same seeds", async () => {
    const a = await scoreShopState(state({ jokers: [powerJoker] }), greedy, [7], 2);
    const b = await scoreShopState(state({ jokers: [powerJoker] }), greedy, [7], 2);
    expect(a).toBe(b);
  });

  test("returns zero for no seeds", async () => {
    expect(await scoreShopState(state(), greedy, [], 3)).toBe(0);
  });
});

describe("pickBestState", () => {
  test("returns the index of the highest score", () => {
    expect(
      pickBestState([
        { item: "a", score: 1.2 },
        { item: "b", score: 3.4 },
        { item: "c", score: 2.1 },
      ]),
    ).toBe(1);
  });

  test("returns -1 for an empty list", () => {
    expect(pickBestState([])).toBe(-1);
  });
});

describe("applyShopBuy", () => {
  test("appends a bought joker and deducts its price", () => {
    const next = applyShopBuy(state({ money: 10 }), jokerItem(powerJoker, 6));
    expect({ jokers: next.jokers.length, money: next.money }).toEqual({ jokers: 1, money: 4 });
  });

  test("upgrades hand stats when a planet is bought", () => {
    const planet = createPlanetCatalog()[0];
    const item: ShopItem = { kind: "planet", planet, price: 3, sold: false };
    const next = applyShopBuy(state({ money: 5 }), item);
    expect(next.money).toBe(2);
  });

  test("does not append a joker when the joker slots are full", () => {
    const full = state({ jokers: Array.from({ length: 16 }, () => powerJoker), money: 10 });
    expect(applyShopBuy(full, jokerItem(powerJoker, 6)).jokers.length).toBe(16);
  });
});

describe("labelByRollout", () => {
  test("labels the candidate whose loadout rolls out best", async () => {
    const weak = state({ jokers: [] });
    const strong = state({ jokers: [powerJoker] });
    const chosen = await labelByRollout([weak, strong, weak], {
      agent: greedy,
      seeds: [1, 2],
      maxRounds: 4,
    });
    expect(chosen).toBe(1);
  });
});
