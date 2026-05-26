// @vitest-environment node
import {
  SUIT_DISPLAY_ORDER,
  createDeck,
  defaultEnhancementForRank,
  drawCountForRefill,
  shuffle,
  deal,
  groupBySuit,
  resetCardIds,
  sortCards,
  SUITS,
  RANKS,
  HAND_SIZE,
  DECK_SIZE,
} from "./deck";
import type { Card, Suit } from "./types";

beforeEach(() => {
  resetCardIds();
});

describe("createDeck", () => {
  test("produces 52 cards", () => {
    expect(createDeck()).toHaveLength(DECK_SIZE);
  });

  test("contains exactly one of each suit+rank combination", () => {
    const deck = createDeck();
    const keys = new Set(deck.map((c) => `${c.rank}-${c.suit}`));
    expect(keys.size).toBe(SUITS.length * RANKS.length);
  });

  test("assigns a unique id to every card", () => {
    const deck = createDeck();
    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(deck.length);
  });

  test("does not assign any enhancement to a fresh deck", () => {
    const deck = createDeck();
    expect(deck.every((c) => c.enhancement === undefined)).toBe(true);
  });

  test("omits cards whose keys appear in the excludedKeys set", () => {
    const excluded = new Set(["K-hearts", "5-spades"]);
    const deck = createDeck(excluded);
    expect(deck.find((c) => c.rank === "K" && c.suit === "hearts")).toBeUndefined();
    expect(deck.find((c) => c.rank === "5" && c.suit === "spades")).toBeUndefined();
  });

  test("excludedKeys shrinks the deck by exactly the number of removed keys", () => {
    const excluded = new Set(["K-hearts", "5-spades"]);
    expect(createDeck(excluded)).toHaveLength(DECK_SIZE - 2);
  });
});

describe("defaultEnhancementForRank", () => {
  test("returns steel for Aces", () => {
    expect(defaultEnhancementForRank("A")).toBe("steel");
  });

  test("returns mult for 4s", () => {
    expect(defaultEnhancementForRank("4")).toBe("mult");
  });

  test("returns wild for 9s", () => {
    expect(defaultEnhancementForRank("9")).toBe("wild");
  });

  test("returns stone for 3s", () => {
    expect(defaultEnhancementForRank("3")).toBe("stone");
  });

  test("returns glass for Ks", () => {
    expect(defaultEnhancementForRank("K")).toBe("glass");
  });

  test("returns lucky for Qs", () => {
    expect(defaultEnhancementForRank("Q")).toBe("lucky");
  });

  test("returns gold for ranks without an explicit assignment", () => {
    expect(defaultEnhancementForRank("J")).toBe("gold");
  });
});

describe("shuffle", () => {
  test("preserves the input length", () => {
    const deck = createDeck();
    expect(shuffle(deck)).toHaveLength(deck.length);
  });

  test("preserves the same set of cards", () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    const ids = new Set(shuffled.map((c) => c.id));
    const original = new Set(deck.map((c) => c.id));
    expect(ids).toEqual(original);
  });

  test("does not mutate the input array", () => {
    const deck = createDeck();
    const snapshot = deck.slice();
    shuffle(deck);
    expect(deck).toEqual(snapshot);
  });

  test("uses the provided rng deterministically", () => {
    const deck = createDeck();
    const rng = () => 0;
    expect(shuffle(deck, rng)).toEqual(shuffle(deck, rng));
  });
});

describe("deal", () => {
  test("returns 8 cards in hand by default", () => {
    const result = deal(createDeck());
    expect(result.hand).toHaveLength(HAND_SIZE);
  });

  test("returns remaining cards equal to deck size minus hand size", () => {
    const result = deal(createDeck());
    expect(result.remaining).toHaveLength(DECK_SIZE - HAND_SIZE);
  });

  test("dealt hand and remaining together include every deck card", () => {
    const deck = createDeck();
    const result = deal(deck);
    expect([...result.hand, ...result.remaining]).toEqual(deck);
  });

  test("respects an explicit count argument", () => {
    const result = deal(createDeck(), 5);
    expect(result.hand).toHaveLength(5);
  });
});

describe("drawCountForRefill (#231)", () => {
  test("draws exactly the just-discarded count when the hand was at hand size", () => {
    expect(drawCountForRefill(8, 6, 44)).toBe(2);
  });

  test("refills the gap when the hand was already short (Immolate case)", () => {
    expect(drawCountForRefill(8, 2, 44)).toBe(6);
  });

  test("caps the draw at the remaining deck size", () => {
    expect(drawCountForRefill(8, 2, 3)).toBe(3);
  });

  test("draws 0 when the hand is already at hand size", () => {
    expect(drawCountForRefill(8, 8, 44)).toBe(0);
  });

  test("draws 0 (never negative) when the hand exceeds hand size", () => {
    expect(drawCountForRefill(8, 10, 44)).toBe(0);
  });

  test("draws 0 when the deck is empty", () => {
    expect(drawCountForRefill(8, 3, 0)).toBe(0);
  });
});

describe("groupBySuit", () => {
  test("returns 13 cards per suit for a full deck", () => {
    const grouped = groupBySuit(createDeck());
    expect(grouped.spades).toHaveLength(RANKS.length);
  });

  test("places each card into its own suit bucket", () => {
    const grouped = groupBySuit(createDeck());
    const allHearts = grouped.hearts.every((c) => c.suit === "hearts");
    expect(allHearts).toBe(true);
  });

  test("returns empty arrays for absent suits", () => {
    const onlyHearts = createDeck().filter((c) => c.suit === "hearts");
    const grouped = groupBySuit(onlyHearts);
    expect(grouped.clubs).toEqual([]);
  });

  test("sorts cards within a suit by rank descending (A high → 2 low)", () => {
    const unordered: Card[] = [
      { id: 1, rank: "2", suit: "hearts" },
      { id: 2, rank: "A", suit: "hearts" },
      { id: 3, rank: "7", suit: "hearts" },
      { id: 4, rank: "K", suit: "hearts" },
      { id: 5, rank: "10", suit: "hearts" },
    ];
    const grouped = groupBySuit(unordered);
    expect(grouped.hearts.map((c) => c.rank)).toEqual([
      "A",
      "K",
      "10",
      "7",
      "2",
    ]);
  });

  test("a full deck's hearts bucket runs A, K, Q, J, 10, …, 2", () => {
    const grouped = groupBySuit(createDeck());
    expect(grouped.hearts.map((c) => c.rank)).toEqual([
      "A",
      "K",
      "Q",
      "J",
      "10",
      "9",
      "8",
      "7",
      "6",
      "5",
      "4",
      "3",
      "2",
    ]);
  });

  test("an empty input produces empty suit buckets", () => {
    const grouped = groupBySuit([]);
    expect(grouped.spades).toEqual([]);
  });
});

describe("sortCards", () => {
  const sample: Card[] = [
    { id: 1, rank: "A", suit: "hearts" },
    { id: 2, rank: "2", suit: "spades" },
    { id: 3, rank: "K", suit: "clubs" },
    { id: 4, rank: "10", suit: "diamonds" },
  ];

  test("rank mode orders cards from A down through 2", () => {
    const sorted = sortCards(sample, "rank");
    expect(sorted.map((c) => c.rank)).toEqual(["A", "K", "10", "2"]);
  });

  test("rank mode breaks ties by suit (clubs → diamonds → spades → hearts)", () => {
    const pair: Card[] = [
      { id: 1, rank: "5", suit: "spades" },
      { id: 2, rank: "5", suit: "clubs" },
      { id: 3, rank: "5", suit: "hearts" },
      { id: 4, rank: "5", suit: "diamonds" },
    ];
    const sorted = sortCards(pair, "rank");
    expect(sorted.map((c) => c.suit)).toEqual([
      "clubs",
      "diamonds",
      "spades",
      "hearts",
    ]);
  });

  test("suit mode groups by suit in clubs → diamonds → spades → hearts order", () => {
    const sorted = sortCards(sample, "suit");
    expect(sorted.map((c) => c.suit)).toEqual([
      "clubs",
      "diamonds",
      "spades",
      "hearts",
    ]);
  });

  test("suit mode orders cards within a suit descending by rank", () => {
    const allSpades: Card[] = [
      { id: 1, rank: "A", suit: "spades" },
      { id: 2, rank: "2", suit: "spades" },
      { id: 3, rank: "K", suit: "spades" },
    ];
    const sorted = sortCards(allSpades, "suit");
    expect(sorted.map((c) => c.rank)).toEqual(["A", "K", "2"]);
  });

  test("does not mutate the input array", () => {
    const snapshot = sample.slice();
    sortCards(sample, "rank");
    expect(sample).toEqual(snapshot);
  });

  test("returns an empty array when given no cards", () => {
    expect(sortCards([], "rank")).toEqual([]);
  });
});

describe("SUIT_DISPLAY_ORDER — alternation invariant (issue #114)", () => {
  const RED_SUITS: ReadonlySet<Suit> = new Set<Suit>(["hearts", "diamonds"]);
  const SHARP_SUITS: ReadonlySet<Suit> = new Set<Suit>(["spades", "diamonds"]);

  function orderedSuits(): Suit[] {
    return (Object.keys(SUIT_DISPLAY_ORDER) as Suit[]).sort(
      (a, b) => SUIT_DISPLAY_ORDER[a] - SUIT_DISPLAY_ORDER[b],
    );
  }

  function isRed(s: Suit): boolean {
    return RED_SUITS.has(s);
  }

  function isSharp(s: Suit): boolean {
    return SHARP_SUITS.has(s);
  }

  test("covers every suit exactly once", () => {
    expect(new Set(orderedSuits()).size).toBe(4);
  });

  test("no two adjacent suits share BOTH color and shape", () => {
    const order = orderedSuits();
    const collisions: Array<[Suit, Suit]> = [];
    for (let i = 0; i < order.length - 1; i += 1) {
      const a = order[i];
      const b = order[i + 1];
      if (isRed(a) === isRed(b) && isSharp(a) === isSharp(b)) {
        collisions.push([a, b]);
      }
    }
    expect(collisions).toEqual([]);
  });

  test("color strictly alternates across the full ordering", () => {
    const order = orderedSuits();
    const colorRuns: Array<[Suit, Suit]> = [];
    for (let i = 0; i < order.length - 1; i += 1) {
      if (isRed(order[i]) === isRed(order[i + 1])) {
        colorRuns.push([order[i], order[i + 1]]);
      }
    }
    expect(colorRuns).toEqual([]);
  });

  test("at most one adjacent pair shares the same shape", () => {
    const order = orderedSuits();
    let sameShapePairs = 0;
    for (let i = 0; i < order.length - 1; i += 1) {
      if (isSharp(order[i]) === isSharp(order[i + 1])) {
        sameShapePairs += 1;
      }
    }
    expect(sameShapePairs).toBeLessThanOrEqual(1);
  });

  test("does not put the two reds (hearts, diamonds) adjacent to each other", () => {
    const order = orderedSuits();
    const redsAdjacent: Array<[Suit, Suit]> = [];
    for (let i = 0; i < order.length - 1; i += 1) {
      if (isRed(order[i]) && isRed(order[i + 1])) {
        redsAdjacent.push([order[i], order[i + 1]]);
      }
    }
    expect(redsAdjacent).toEqual([]);
  });

  test("does not put the two blacks (spades, clubs) adjacent to each other", () => {
    const order = orderedSuits();
    const blacksAdjacent: Array<[Suit, Suit]> = [];
    for (let i = 0; i < order.length - 1; i += 1) {
      if (!isRed(order[i]) && !isRed(order[i + 1])) {
        blacksAdjacent.push([order[i], order[i + 1]]);
      }
    }
    expect(blacksAdjacent).toEqual([]);
  });
});
