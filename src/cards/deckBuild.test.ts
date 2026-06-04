// @vitest-environment node
import {
  applyEnhancementOverrides,
  applySealOverrides,
  buildShuffledDeck,
  countEnhancedInFullDeck,
  fullDeckPile,
  initialDeal,
} from "./deckBuild";
import { createDeck, resetCardIds, DECK_SIZE, HAND_SIZE } from "./deck";
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
      [card({ id: 7 })],
      new Map([[7, "gold"]]),
    );
    expect(result[0].enhancement).toBe("gold");
  });

  test("does not override a card that already has an enhancement", () => {
    const result = applyEnhancementOverrides(
      [card({ id: 7, enhancement: "steel" })],
      new Map([[7, "gold"]]),
    );
    expect(result[0].enhancement).toBe("steel");
  });

  test("leaves a card untouched when its id is absent from the map", () => {
    const result = applyEnhancementOverrides([card({ id: 7 })], new Map());
    expect(result[0].enhancement).toBeUndefined();
  });

  test("does not bleed an override onto a sibling card with the same rank+suit", () => {
    const result = applyEnhancementOverrides(
      [card({ id: 1 }), card({ id: 2 })],
      new Map([[1, "gold"]]),
    );
    expect(result[1].enhancement).toBeUndefined();
  });
});

describe("applySealOverrides", () => {
  test("applies an override to a card without a seal", () => {
    const result = applySealOverrides([card({ id: 7 })], new Map([[7, "red"]]));
    expect(result[0].seal).toBe("red");
  });

  test("does not override a card that already has a seal", () => {
    const result = applySealOverrides(
      [card({ id: 7, seal: "blue" })],
      new Map([[7, "red"]]),
    );
    expect(result[0].seal).toBe("blue");
  });

  test("overrides a card whose seal is explicitly null", () => {
    const result = applySealOverrides(
      [card({ id: 7, seal: null })],
      new Map([[7, "red"]]),
    );
    expect(result[0].seal).toBe("red");
  });

  test("does not bleed a seal onto a sibling card with the same rank+suit", () => {
    const result = applySealOverrides(
      [card({ id: 1 }), card({ id: 2 })],
      new Map([[1, "red"]]),
    );
    expect(result[1].seal).toBeUndefined();
  });
});

describe("buildShuffledDeck", () => {
  test("returns the base deck when nothing is destroyed", () => {
    const base = createDeck();
    expect(buildShuffledDeck(base)).toHaveLength(DECK_SIZE);
  });

  test("includes added cards in the result", () => {
    const base = createDeck();
    const added = [card({ id: 999, rank: "A", suit: "spades" })];
    expect(buildShuffledDeck(base, new Set(), added)).toHaveLength(
      DECK_SIZE + 1,
    );
  });

  test("applies an enhancement override by card id", () => {
    const base = createDeck();
    const target = base[0];
    const deck = buildShuffledDeck(
      base,
      new Set(),
      [],
      new Map([[target.id, "gold"]]),
    );
    expect(deck.find((c) => c.id === target.id)?.enhancement).toBe("gold");
  });

  test("omits destroyed cards from the deck", () => {
    const base = createDeck();
    const destroyedId = base[0].id;
    const deck = buildShuffledDeck(base, new Set([destroyedId]));
    expect(deck.some((c) => c.id === destroyedId)).toBe(false);
  });

  test("does not destroy a sibling card with the same rank+suit when an added duplicate is destroyed", () => {
    const base = createDeck();
    const baseAce = base.find((c) => c.rank === "A" && c.suit === "spades");
    if (!baseAce) throw new Error("missing base ace");
    const addedAce = card({ id: 999, rank: "A", suit: "spades" });
    const deck = buildShuffledDeck(base, new Set([999]), [addedAce]);
    expect(deck.some((c) => c.id === baseAce.id)).toBe(true);
  });
});

describe("initialDeal", () => {
  test("deals the requested hand size", () => {
    expect(initialDeal(createDeck(), new Set(), 5).hand).toHaveLength(5);
  });

  test("retains every card across hand and remaining", () => {
    const result = initialDeal(createDeck());
    expect(result.hand.length + result.remaining.length).toBe(DECK_SIZE);
  });

  test("clamps a hand size of zero to one card", () => {
    expect(initialDeal(createDeck(), new Set(), 0).hand).toHaveLength(1);
  });

  test("defaults to the base hand size", () => {
    expect(initialDeal(createDeck()).hand).toHaveLength(HAND_SIZE);
  });
});

describe("fullDeckPile", () => {
  test("leaves the hand empty", () => {
    expect(fullDeckPile(createDeck()).hand).toHaveLength(0);
  });

  test("places the full deck in remaining", () => {
    expect(fullDeckPile(createDeck()).remaining).toHaveLength(DECK_SIZE);
  });

  test("includes added cards in remaining", () => {
    const base = createDeck();
    const added = [card({ id: 999 })];
    expect(fullDeckPile(base, new Set(), added).remaining).toHaveLength(
      DECK_SIZE + 1,
    );
  });

  test("preserves base card identity across rebuilds", () => {
    const base = createDeck();
    const first = fullDeckPile(base).remaining.map((c) => c.id).sort();
    const second = fullDeckPile(base).remaining.map((c) => c.id).sort();
    expect(first).toEqual(second);
  });
});

describe("acceptance criteria (#639)", () => {
  test("enhancement applied by id survives a deck rebuild", () => {
    const base = createDeck();
    const target = base[0];
    const overrides = new Map([[target.id, "gold" as const]]);
    const first = fullDeckPile(base, new Set(), [], overrides);
    const second = fullDeckPile(base, new Set(), [], overrides);
    expect(second.remaining.find((c) => c.id === target.id)?.enhancement).toBe(
      "gold",
    );
    expect(first.remaining.find((c) => c.id === target.id)?.enhancement).toBe(
      "gold",
    );
  });

  test("seal applied by id survives a deck rebuild", () => {
    const base = createDeck();
    const target = base[0];
    const seals = new Map([[target.id, "red" as const]]);
    const rebuilt = fullDeckPile(base, new Set(), [], new Map(), seals);
    expect(rebuilt.remaining.find((c) => c.id === target.id)?.seal).toBe("red");
  });

  test("an added card with the same rank+suit as a base card does not inherit the base card's enhancement", () => {
    const base = createDeck();
    const baseAce = base.find((c) => c.rank === "A" && c.suit === "spades");
    if (!baseAce) throw new Error("missing base ace");
    const addedAce = card({ id: 999, rank: "A", suit: "spades" });
    const overrides = new Map([[baseAce.id, "gold" as const]]);
    const deck = buildShuffledDeck(base, new Set(), [addedAce], overrides);
    expect(deck.find((c) => c.id === 999)?.enhancement).toBeUndefined();
  });

  test("destroying one duplicated card does not destroy the other", () => {
    const base = createDeck();
    const baseAce = base.find((c) => c.rank === "A" && c.suit === "spades");
    if (!baseAce) throw new Error("missing base ace");
    const addedAce = card({ id: 999, rank: "A", suit: "spades" });
    const deck = buildShuffledDeck(base, new Set([baseAce.id]), [addedAce]);
    expect(deck.some((c) => c.id === 999)).toBe(true);
  });

  test("a seal on one duplicate does not propagate to the other", () => {
    const base = createDeck();
    const baseAce = base.find((c) => c.rank === "A" && c.suit === "spades");
    if (!baseAce) throw new Error("missing base ace");
    const addedAce = card({ id: 999, rank: "A", suit: "spades" });
    const seals = new Map([[baseAce.id, "gold" as const]]);
    const deck = buildShuffledDeck(
      base,
      new Set(),
      [addedAce],
      new Map(),
      seals,
    );
    expect(deck.find((c) => c.id === 999)?.seal).toBeUndefined();
  });
});

describe("countEnhancedInFullDeck", () => {
  test("returns 0 when no overrides and no added cards are enhanced", () => {
    expect(countEnhancedInFullDeck()).toBe(0);
  });

  test("counts each base-deck enhancement override exactly once", () => {
    const base = createDeck();
    const overrides = new Map([
      [base[0].id, "gold" as const],
      [base[1].id, "steel" as const],
      [base[2].id, "glass" as const],
    ]);
    expect(countEnhancedInFullDeck(base, new Set(), [], overrides)).toBe(3);
  });

  test("counts a base override and a separate added enhancement as two", () => {
    const base = createDeck();
    const overrides = new Map([[base[0].id, "gold" as const]]);
    const added = [card({ id: 999, enhancement: "steel" })];
    expect(countEnhancedInFullDeck(base, new Set(), added, overrides)).toBe(2);
  });

  test("counts added cards that carry their own enhancement", () => {
    const added = [
      card({ id: 100, rank: "2", suit: "clubs", enhancement: "mult" }),
      card({ id: 101, rank: "3", suit: "clubs", enhancement: "bonus" }),
    ];
    expect(countEnhancedInFullDeck([], new Set(), added)).toBe(2);
  });

  test("does not count added cards that lack an enhancement", () => {
    const added = [card({ id: 100, rank: "2", suit: "clubs" })];
    expect(countEnhancedInFullDeck([], new Set(), added)).toBe(0);
  });

  test("a destroyed card no longer contributes its base override", () => {
    const base = createDeck();
    const target = base[0];
    const overrides = new Map([[target.id, "gold" as const]]);
    expect(
      countEnhancedInFullDeck(base, new Set([target.id]), [], overrides),
    ).toBe(0);
  });
});
