// @vitest-environment node
import {
  applyEnhancementOverrides,
  applySealOverrides,
  buildShuffledDeck,
  fullDeckPile,
  initialDeal,
} from "./deckBuild";
import { cardKey, createDeck, resetCardIds, DECK_SIZE, HAND_SIZE } from "./deck";
import type { Card } from "./types";

beforeEach(() => {
  resetCardIds();
});

function card(overrides: Partial<Card> = {}): Card {
  return { id: 1, rank: "A", suit: "spades", ...overrides };
}

describe("applyEnhancementOverrides", () => {
  test("applies an override to a matching card without an enhancement", () => {
    const result = applyEnhancementOverrides(
      [card()],
      new Map([["A-spades", "gold"]]),
    );
    expect(result[0].enhancement).toBe("gold");
  });

  test("does not override a card that already has an enhancement", () => {
    const result = applyEnhancementOverrides(
      [card({ enhancement: "steel" })],
      new Map([["A-spades", "gold"]]),
    );
    expect(result[0].enhancement).toBe("steel");
  });

  test("leaves a card untouched when its key is absent from the map", () => {
    const result = applyEnhancementOverrides([card()], new Map());
    expect(result[0].enhancement).toBeUndefined();
  });
});

describe("applySealOverrides", () => {
  test("applies an override to a card without a seal", () => {
    const result = applySealOverrides([card()], new Map([["A-spades", "red"]]));
    expect(result[0].seal).toBe("red");
  });

  test("does not override a card that already has a seal", () => {
    const result = applySealOverrides(
      [card({ seal: "blue" })],
      new Map([["A-spades", "red"]]),
    );
    expect(result[0].seal).toBe("blue");
  });

  test("overrides a card whose seal is explicitly null", () => {
    const result = applySealOverrides(
      [card({ seal: null })],
      new Map([["A-spades", "red"]]),
    );
    expect(result[0].seal).toBe("red");
  });
});

describe("buildShuffledDeck", () => {
  test("returns a full deck by default", () => {
    expect(buildShuffledDeck()).toHaveLength(DECK_SIZE);
  });

  test("includes added cards in the result", () => {
    const added = [card({ id: 999, rank: "A", suit: "spades" })];
    expect(buildShuffledDeck(new Set(), added)).toHaveLength(DECK_SIZE + 1);
  });

  test("applies an enhancement override by key", () => {
    const deck = buildShuffledDeck(
      new Set(),
      [],
      new Map([["A-spades", "gold"]]),
    );
    const ace = deck.find((c) => cardKey(c) === "A-spades");
    expect(ace?.enhancement).toBe("gold");
  });

  test("omits excluded keys from the deck", () => {
    const deck = buildShuffledDeck(new Set(["A-spades"]));
    expect(deck.some((c) => cardKey(c) === "A-spades")).toBe(false);
  });
});

describe("initialDeal", () => {
  test("deals the requested hand size", () => {
    expect(initialDeal(new Set(), 5).hand).toHaveLength(5);
  });

  test("retains every card across hand and remaining", () => {
    const result = initialDeal();
    expect(result.hand.length + result.remaining.length).toBe(DECK_SIZE);
  });

  test("clamps a hand size of zero to one card", () => {
    expect(initialDeal(new Set(), 0).hand).toHaveLength(1);
  });

  test("defaults to the base hand size", () => {
    expect(initialDeal().hand).toHaveLength(HAND_SIZE);
  });
});

describe("fullDeckPile", () => {
  test("leaves the hand empty", () => {
    expect(fullDeckPile().hand).toHaveLength(0);
  });

  test("places the full deck in remaining", () => {
    expect(fullDeckPile().remaining).toHaveLength(DECK_SIZE);
  });

  test("includes added cards in remaining", () => {
    const added = [card({ id: 999 })];
    expect(fullDeckPile(new Set(), added).remaining).toHaveLength(
      DECK_SIZE + 1,
    );
  });
});
