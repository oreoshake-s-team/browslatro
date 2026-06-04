// @vitest-environment node
import {
  applyEnhancementOverrides,
  applySealOverrides,
  buildShuffledDeck,
  countEnhancedInFullDeck,
  fullDeckPile,
  initialDeal,
} from "./deckBuild";
import { cardKey, resetCardIds, DECK_SIZE, HAND_SIZE } from "./deck";
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

describe("countEnhancedInFullDeck", () => {
  test("returns 0 when no overrides and no added cards are enhanced", () => {
    expect(countEnhancedInFullDeck()).toBe(0);
  });

  test("counts each base-deck enhancement override exactly once", () => {
    const overrides = new Map([
      ["A-spades", "gold" as const],
      ["K-hearts", "steel" as const],
      ["5-diamonds", "glass" as const],
    ]);
    expect(countEnhancedInFullDeck(new Set(), [], overrides)).toBe(3);
  });

  test("does not double-count an enhanced added card whose rank-suit also has a base override", () => {
    const overrides = new Map([["A-spades", "gold" as const]]);
    const added = [card({ id: 999, enhancement: "steel" })];
    expect(countEnhancedInFullDeck(new Set(), added, overrides)).toBe(2);
  });

  test("counts added cards that carry their own enhancement", () => {
    const added = [
      card({ id: 1, rank: "2", suit: "clubs", enhancement: "mult" }),
      card({ id: 2, rank: "3", suit: "clubs", enhancement: "bonus" }),
    ];
    expect(countEnhancedInFullDeck(new Set(), added)).toBe(2);
  });

  test("does not count added cards that lack an enhancement", () => {
    const added = [card({ id: 1, rank: "2", suit: "clubs" })];
    expect(countEnhancedInFullDeck(new Set(), added)).toBe(0);
  });

  test("a destroyed rank-suit no longer contributes its base override", () => {
    const overrides = new Map([["A-spades", "gold" as const]]);
    expect(
      countEnhancedInFullDeck(new Set(["A-spades"]), [], overrides),
    ).toBe(0);
  });
});
