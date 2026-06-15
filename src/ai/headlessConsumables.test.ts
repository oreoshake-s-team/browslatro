// @vitest-environment node
import { describe, expect, test } from "vitest";
import { createJokerCatalog } from "../items/jokers/catalog";
import {
  applySpectralEffectToDeck,
  applyTarotEffectToDeck,
  type ConsumableContext,
} from "./headlessConsumables";
import { card } from "./test-helpers";

const NON_LEGENDARY_JOKERS = createJokerCatalog().filter((j) => j.rarity !== "legendary");

function ctx(overrides: Partial<ConsumableContext> = {}): ConsumableContext {
  return {
    deck: [card("2", "clubs"), card("9", "hearts"), card("K", "spades")],
    money: 10,
    jokers: [],
    jokerCatalog: NON_LEGENDARY_JOKERS,
    jokerCapacity: 5,
    ...overrides,
  };
}

function bigCtx(): ConsumableContext {
  const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;
  return ctx({ deck: ranks.map((r) => card(r, "clubs")) });
}

describe("applyTarotEffectToDeck", () => {
  test("apply-enhancement targets the highest-rank card", () => {
    const r = applyTarotEffectToDeck(
      ctx(),
      { kind: "apply-enhancement", enhancement: "gold", maxTargets: 1 },
      () => 0,
    );
    expect(r.deck.find((c) => c.rank === "K")?.enhancement).toBe("gold");
  });

  test("apply-enhancement leaves lower cards untouched (negative)", () => {
    const r = applyTarotEffectToDeck(
      ctx(),
      { kind: "apply-enhancement", enhancement: "gold", maxTargets: 1 },
      () => 0,
    );
    expect(r.deck.find((c) => c.rank === "2")?.enhancement).toBeUndefined();
  });

  test("rank-up-selected raises the top card's rank", () => {
    const r = applyTarotEffectToDeck(ctx(), { kind: "rank-up-selected", maxTargets: 1 }, () => 0);
    expect(r.deck.some((c) => c.rank === "A")).toBe(true);
  });

  test("convert-suit converts the targeted cards", () => {
    const r = applyTarotEffectToDeck(
      ctx(),
      { kind: "convert-suit", suit: "diamonds", maxTargets: 3 },
      () => 0,
    );
    expect(r.deck.every((c) => c.suit === "diamonds")).toBe(true);
  });

  test("money-multiply adds money up to the cap", () => {
    const r = applyTarotEffectToDeck(
      ctx(),
      { kind: "money-multiply", multiplier: 2, bonusCap: 20 },
      () => 0,
    );
    expect(r.money).toBe(20);
  });

  test("destroy-selected removes the targeted top cards from the deck", () => {
    const r = applyTarotEffectToDeck(bigCtx(), { kind: "destroy-selected", maxTargets: 2 }, () => 0);
    expect(r.deck.length).toBe(10);
  });

  test("destroy-selected leaves a small deck intact so it can still deal (negative)", () => {
    const base = ctx();
    const r = applyTarotEffectToDeck(base, { kind: "destroy-selected", maxTargets: 2 }, () => 0);
    expect(r.deck.length).toBe(base.deck.length);
  });

  test("death-copy turns the left target into a copy of the right", () => {
    const r = applyTarotEffectToDeck(bigCtx(), { kind: "death-copy", requiredTargets: 2 }, () => 0);
    expect(r.deck.filter((c) => c.rank === "Q").length).toBe(2);
  });

  test("death-copy keeps the deck size unchanged", () => {
    const r = applyTarotEffectToDeck(bigCtx(), { kind: "death-copy", requiredTargets: 2 }, () => 0);
    expect(r.deck.length).toBe(12);
  });

  test("create-joker returns a created joker when there is capacity", () => {
    const r = applyTarotEffectToDeck(ctx(), { kind: "create-joker" }, () => 0);
    expect(r.createdJoker).not.toBeUndefined();
  });

  test("create-joker returns no joker when the joker slots are full (negative)", () => {
    const r = applyTarotEffectToDeck(ctx({ jokerCapacity: 0 }), { kind: "create-joker" }, () => 0);
    expect(r.createdJoker).toBeUndefined();
  });

  test("create-joker excludes already-owned jokers", () => {
    const owned = [NON_LEGENDARY_JOKERS[0]];
    const r = applyTarotEffectToDeck(ctx({ jokers: owned }), { kind: "create-joker" }, () => 0);
    expect(r.createdJoker?.id).not.toBe(owned[0].id);
  });

  test("an unmodeled tarot effect leaves the deck and money unchanged (negative)", () => {
    const base = ctx();
    const r = applyTarotEffectToDeck(base, { kind: "copy-last-consumable" }, () => 0);
    expect(r.deck).toBe(base.deck);
  });
});

describe("applySpectralEffectToDeck", () => {
  test("apply-seal seals the highest-rank card", () => {
    const r = applySpectralEffectToDeck(
      ctx(),
      { kind: "apply-seal", seal: "gold", maxTargets: 1 },
      () => 0,
    );
    expect(r.deck.find((c) => c.rank === "K")?.seal).toBe("gold");
  });

  test("aura adds an edition to the highest-rank card", () => {
    const r = applySpectralEffectToDeck(ctx(), { kind: "aura", maxTargets: 1 }, () => 0);
    expect(r.deck.find((c) => c.rank === "K")?.edition).not.toBeUndefined();
  });

  test("immolate destroys cards from the deck", () => {
    const r = applySpectralEffectToDeck(
      bigCtx(),
      { kind: "immolate", destroyCount: 3, moneyGain: 20 },
      () => 0,
    );
    expect(r.deck.length).toBe(9);
  });

  test("immolate pays out its money gain", () => {
    const r = applySpectralEffectToDeck(
      bigCtx(),
      { kind: "immolate", destroyCount: 3, moneyGain: 20 },
      () => 0,
    );
    expect(r.money).toBe(30);
  });

  test("duplicate-selected adds copies of the top card to the deck", () => {
    const r = applySpectralEffectToDeck(
      ctx(),
      { kind: "duplicate-selected", copies: 1, maxTargets: 1 },
      () => 0,
    );
    expect(r.deck.filter((c) => c.rank === "K").length).toBe(2);
  });

  test("transmute replaces one card with new enhanced additions", () => {
    const r = applySpectralEffectToDeck(
      bigCtx(),
      { kind: "transmute", rankFilter: "numbered", addCount: 2 },
      () => 0,
    );
    expect(r.deck.length).toBe(13);
  });

  test("an unmodeled spectral effect leaves the deck unchanged (negative)", () => {
    const base = ctx();
    const r = applySpectralEffectToDeck(base, { kind: "black-hole" }, () => 0);
    expect(r.deck).toBe(base.deck);
  });
});
