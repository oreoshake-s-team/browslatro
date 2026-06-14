// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  applyOfferToState,
  bestShopChoice,
  type PostShopState,
  type RolloutOptions,
} from "./shopRolloutExpert";
import { createGreedyAgent } from "./agents";
import { joker } from "./test-helpers";
import { createDefaultHandStats } from "../scoring/handStats";
import { MAX_JOKERS } from "../items/jokers/constants";
import type { ShopItem } from "../items/shop";
import type { Joker } from "../items/jokers/types";

const powerJoker: Joker = joker({
  id: "power-joker",
  effect: { kind: "additive-mult", amount: 100000 },
});

function jokerOffer(j: Joker, price: number): ShopItem {
  return { kind: "joker", joker: j, price, sold: false };
}

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
