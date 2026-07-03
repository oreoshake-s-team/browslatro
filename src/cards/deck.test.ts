// @vitest-environment node
import {
  SUIT_DISPLAY_ORDER,
  applyDeckCompositionTransform,
  applyDeckCompositionTransforms,
  createDeck,
  defaultEnhancementForRank,
  drawCountForRefill,
  shuffle,
  deal,
  groupBySuit,
  summarizeDeck,
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

});

describe("defaultEnhancementForRank", () => {
  test.each<{ rank: "A" | "4" | "9" | "3" | "K" | "Q"; enhancement: string }>([
    { rank: "A", enhancement: "steel" },
    { rank: "4", enhancement: "mult" },
    { rank: "9", enhancement: "wild" },
    { rank: "3", enhancement: "stone" },
    { rank: "K", enhancement: "glass" },
    { rank: "Q", enhancement: "lucky" },
  ])("returns $enhancement for $rank", ({ rank, enhancement }) => {
    expect(defaultEnhancementForRank(rank)).toBe(enhancement);
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

describe("drawCountForRefill", () => {
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

  test("rank mode places stone cards after every non-stone card", () => {
    const withStone: Card[] = [
      { id: 1, rank: "A", suit: "hearts", enhancement: "stone" },
      { id: 2, rank: "2", suit: "spades" },
      { id: 3, rank: "K", suit: "clubs" },
    ];
    const sorted = sortCards(withStone, "rank");
    expect(sorted.map((c) => c.id)).toEqual([3, 2, 1]);
  });

  test("suit mode places stone cards after every non-stone card", () => {
    const withStone: Card[] = [
      { id: 1, rank: "5", suit: "clubs", enhancement: "stone" },
      { id: 2, rank: "9", suit: "hearts" },
      { id: 3, rank: "3", suit: "spades" },
    ];
    const sorted = sortCards(withStone, "suit");
    expect(sorted.map((c) => c.id)).toEqual([3, 2, 1]);
  });

  test("stone cards keep their relative order in rank mode", () => {
    const twoStones: Card[] = [
      { id: 1, rank: "2", suit: "clubs", enhancement: "stone" },
      { id: 2, rank: "7", suit: "diamonds" },
      { id: 3, rank: "A", suit: "spades", enhancement: "stone" },
    ];
    const sorted = sortCards(twoStones, "rank");
    expect(sorted.map((c) => c.id)).toEqual([2, 1, 3]);
  });

  test("stone cards keep their relative order in suit mode", () => {
    const twoStones: Card[] = [
      { id: 1, rank: "A", suit: "hearts", enhancement: "stone" },
      { id: 2, rank: "7", suit: "diamonds" },
      { id: 3, rank: "2", suit: "clubs", enhancement: "stone" },
    ];
    const sorted = sortCards(twoStones, "suit");
    expect(sorted.map((c) => c.id)).toEqual([2, 1, 3]);
  });

  test("cards with non-stone enhancements are not moved to the end", () => {
    const enhanced: Card[] = [
      { id: 1, rank: "2", suit: "spades" },
      { id: 2, rank: "A", suit: "hearts", enhancement: "glass" },
    ];
    const sorted = sortCards(enhanced, "rank");
    expect(sorted.map((c) => c.id)).toEqual([2, 1]);
  });

  test("a hand of only stone cards keeps its original order", () => {
    const allStone: Card[] = [
      { id: 1, rank: "A", suit: "hearts", enhancement: "stone" },
      { id: 2, rank: "2", suit: "clubs", enhancement: "stone" },
      { id: 3, rank: "K", suit: "spades", enhancement: "stone" },
    ];
    const sorted = sortCards(allStone, "suit");
    expect(sorted.map((c) => c.id)).toEqual([1, 2, 3]);
  });
});

describe("SUIT_DISPLAY_ORDER — alternation invariant", () => {
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

describe("applyDeckCompositionTransform — drop-face-cards (Abandoned Deck)", () => {
  test("removes every Jack, Queen, and King", () => {
    const result = applyDeckCompositionTransform(createDeck(), "drop-face-cards");
    const facesRemaining = result.filter((c) =>
      ["J", "Q", "K"].includes(c.rank),
    );
    expect(facesRemaining).toEqual([]);
  });

  test("reduces a full 52-card deck to 40 cards", () => {
    const result = applyDeckCompositionTransform(createDeck(), "drop-face-cards");
    expect(result).toHaveLength(40);
  });

  test("keeps every non-face card intact", () => {
    const result = applyDeckCompositionTransform(createDeck(), "drop-face-cards");
    const nonFaceRanks: Array<"2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "A"> = [
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "A",
    ];
    expect(
      nonFaceRanks.every(
        (rank) => result.filter((c) => c.rank === rank).length === 4,
      ),
    ).toBe(true);
  });

  test("does not mutate the input array", () => {
    const deck = createDeck();
    const snapshot = deck.slice();
    applyDeckCompositionTransform(deck, "drop-face-cards");
    expect(deck).toEqual(snapshot);
  });

  test("aces (a 'face' card in some conventions) are preserved", () => {
    const result = applyDeckCompositionTransform(createDeck(), "drop-face-cards");
    expect(result.filter((c) => c.rank === "A")).toHaveLength(4);
  });

  test("returns an empty array when given no cards (negative)", () => {
    expect(applyDeckCompositionTransform([], "drop-face-cards")).toEqual([]);
  });
});

describe("applyDeckCompositionTransform — spades-and-hearts-only (Checkered Deck)", () => {
  test("keeps the deck at 52 cards", () => {
    const result = applyDeckCompositionTransform(
      createDeck(),
      "spades-and-hearts-only",
    );
    expect(result).toHaveLength(52);
  });

  test("produces exactly 26 Spades and 26 Hearts", () => {
    const result = applyDeckCompositionTransform(
      createDeck(),
      "spades-and-hearts-only",
    );
    const counts = result.reduce<Record<Suit, number>>(
      (acc, c) => {
        acc[c.suit] += 1;
        return acc;
      },
      { spades: 0, hearts: 0, diamonds: 0, clubs: 0 },
    );
    expect(counts).toEqual({
      spades: 26,
      hearts: 26,
      diamonds: 0,
      clubs: 0,
    });
  });

  test("contains no Clubs", () => {
    const result = applyDeckCompositionTransform(
      createDeck(),
      "spades-and-hearts-only",
    );
    expect(result.filter((c) => c.suit === "clubs")).toEqual([]);
  });

  test("contains no Diamonds", () => {
    const result = applyDeckCompositionTransform(
      createDeck(),
      "spades-and-hearts-only",
    );
    expect(result.filter((c) => c.suit === "diamonds")).toEqual([]);
  });

  test("every rank appears exactly twice as Spades and twice as Hearts", () => {
    const result = applyDeckCompositionTransform(
      createDeck(),
      "spades-and-hearts-only",
    );
    const ranksWithExpectedSplit = RANKS.every((rank) => {
      const spades = result.filter(
        (c) => c.rank === rank && c.suit === "spades",
      ).length;
      const hearts = result.filter(
        (c) => c.rank === rank && c.suit === "hearts",
      ).length;
      return spades === 2 && hearts === 2;
    });
    expect(ranksWithExpectedSplit).toBe(true);
  });

  test("does not mutate the input array", () => {
    const deck = createDeck();
    const snapshot = deck.slice();
    applyDeckCompositionTransform(deck, "spades-and-hearts-only");
    expect(deck).toEqual(snapshot);
  });

  test("returns an empty array when given no cards (negative)", () => {
    expect(
      applyDeckCompositionTransform([], "spades-and-hearts-only"),
    ).toEqual([]);
  });
});

describe("applyDeckCompositionTransforms — pipeline", () => {
  test("returns the input unchanged when no transforms are supplied (negative)", () => {
    const deck = createDeck();
    expect(applyDeckCompositionTransforms(deck, [])).toEqual(deck);
  });

  test("applies a drop-face-cards transform from the pipeline", () => {
    const deck = createDeck();
    const result = applyDeckCompositionTransforms(deck, ["drop-face-cards"]);
    expect(result).toHaveLength(40);
  });

  test("applies a spades-and-hearts-only transform from the pipeline", () => {
    const deck = createDeck();
    const result = applyDeckCompositionTransforms(deck, [
      "spades-and-hearts-only",
    ]);
    expect(
      result.every((c) => c.suit === "spades" || c.suit === "hearts"),
    ).toBe(true);
  });
});

describe("summarizeDeck", () => {
  test("counts 13 cards for each suit in a full deck", () => {
    const { suitCounts } = summarizeDeck(createDeck());
    expect(suitCounts).toEqual({
      spades: 13,
      hearts: 13,
      diamonds: 13,
      clubs: 13,
    });
  });

  test("counts 4 cards for each rank in a full deck", () => {
    const { rankCounts } = summarizeDeck(createDeck());
    expect(RANKS.every((rank) => rankCounts[rank] === 4)).toBe(true);
  });

  test("reports zero for a suit with no remaining cards", () => {
    const onlySpades = createDeck().filter((c) => c.suit === "spades");
    expect(summarizeDeck(onlySpades).suitCounts.hearts).toBe(0);
  });

  test("reports zero for a rank with no remaining cards", () => {
    const noAces = createDeck().filter((c) => c.rank !== "A");
    expect(summarizeDeck(noAces).rankCounts.A).toBe(0);
  });

  test("excludes a removed card from its suit count", () => {
    const withoutAceSpades = createDeck().filter(
      (c) => !(c.rank === "A" && c.suit === "spades"),
    );
    expect(summarizeDeck(withoutAceSpades).suitCounts.spades).toBe(12);
  });

  test("excludes a removed card from its rank count", () => {
    const withoutAceSpades = createDeck().filter(
      (c) => !(c.rank === "A" && c.suit === "spades"),
    );
    expect(summarizeDeck(withoutAceSpades).rankCounts.A).toBe(3);
  });

  test("returns all-zero counts for an empty deck", () => {
    const { suitCounts, rankCounts } = summarizeDeck([]);
    const allZero =
      SUITS.every((suit) => suitCounts[suit] === 0) &&
      RANKS.every((rank) => rankCounts[rank] === 0);
    expect(allZero).toBe(true);
  });
});
