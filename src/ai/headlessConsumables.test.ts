// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  applySpectralEffectToDeck,
  applyTarotEffectToDeck,
  type ConsumableContext,
} from "./headlessConsumables";
import { card } from "./test-helpers";

function ctx(): ConsumableContext {
  return {
    deck: [card("2", "clubs"), card("9", "hearts"), card("K", "spades")],
    money: 10,
    jokers: [],
  };
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

  test("an unmodeled tarot effect leaves the deck and money unchanged (negative)", () => {
    const base = ctx();
    const r = applyTarotEffectToDeck(base, { kind: "create-joker" }, () => 0);
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

  test("an unmodeled spectral effect leaves the deck unchanged (negative)", () => {
    const base = ctx();
    const r = applySpectralEffectToDeck(base, { kind: "black-hole" }, () => 0);
    expect(r.deck).toBe(base.deck);
  });
});
