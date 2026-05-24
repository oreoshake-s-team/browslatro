import {
  createDeck,
  shuffle,
  deal,
  groupBySuit,
  resetCardIds,
  SUITS,
  RANKS,
  HAND_SIZE,
  DECK_SIZE,
} from "./deck";

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
});
