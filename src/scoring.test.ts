import {
  forEachScoringStep,
  getCardChips,
  getRankChips,
  getScoringCards,
  getScoringStep,
  scoreHand,
  type ScoringStep,
} from "./scoring";
import type { Card, Enhancement, Rank, Suit } from "./types";

let nextId = 0;
function card(rank: Rank, suit: Suit, enhancement?: Enhancement): Card {
  return enhancement
    ? { id: ++nextId, rank, suit, enhancement }
    : { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("getRankChips — rank to chip value mapping", () => {
  test("number rank is worth its face value (5 → 5)", () => {
    expect(getRankChips("5")).toBe(5);
  });

  test("rank 10 is worth 10 chips", () => {
    expect(getRankChips("10")).toBe(10);
  });

  test("jack is worth 10 chips", () => {
    expect(getRankChips("J")).toBe(10);
  });

  test("queen is worth 10 chips", () => {
    expect(getRankChips("Q")).toBe(10);
  });

  test("king is worth 10 chips", () => {
    expect(getRankChips("K")).toBe(10);
  });

  test("ace is worth 11 chips", () => {
    expect(getRankChips("A")).toBe(11);
  });
});

describe("getScoringCards — scoping by hand type", () => {
  test("empty selection returns no scoring cards", () => {
    expect(getScoringCards([], "High Card")).toEqual([]);
  });

  test("High Card returns only the single highest-ranked card", () => {
    const low = card("3", "spades");
    const high = card("K", "hearts");
    expect(getScoringCards([low, high], "High Card")).toEqual([high]);
  });

  test("High Card treats Ace as higher than King", () => {
    const king = card("K", "spades");
    const ace = card("A", "hearts");
    expect(getScoringCards([king, ace], "High Card")).toEqual([ace]);
  });

  test("Pair excludes a non-paired kicker even when it outranks the pair", () => {
    const pair1 = card("5", "spades");
    const pair2 = card("5", "hearts");
    const kicker = card("K", "clubs");
    expect(getScoringCards([pair1, pair2, kicker], "Pair")).not.toContain(
      kicker,
    );
  });

  test("Two Pair excludes the kicker", () => {
    const kicker = card("3", "clubs");
    const cards = [
      card("A", "spades"),
      card("A", "hearts"),
      card("K", "spades"),
      card("K", "hearts"),
      kicker,
    ];
    expect(getScoringCards(cards, "Two Pair")).not.toContain(kicker);
  });

  test("Three of a Kind returns only the three matching cards", () => {
    const t1 = card("Q", "spades");
    const t2 = card("Q", "hearts");
    const t3 = card("Q", "clubs");
    const kicker = card("3", "spades");
    expect(getScoringCards([t1, t2, t3, kicker], "Three of a Kind")).toEqual([
      t1,
      t2,
      t3,
    ]);
  });

  test("Flush returns all 5 cards", () => {
    const cards = [
      card("2", "hearts"),
      card("5", "hearts"),
      card("7", "hearts"),
      card("9", "hearts"),
      card("J", "hearts"),
    ];
    expect(getScoringCards(cards, "Flush")).toEqual(cards);
  });

  test("Straight returns all 5 cards", () => {
    const cards = [
      card("5", "spades"),
      card("6", "hearts"),
      card("7", "clubs"),
      card("8", "diamonds"),
      card("9", "spades"),
    ];
    expect(getScoringCards(cards, "Straight")).toEqual(cards);
  });

  test("Royal Flush returns all 5 cards", () => {
    const cards = [
      card("10", "diamonds"),
      card("J", "diamonds"),
      card("Q", "diamonds"),
      card("K", "diamonds"),
      card("A", "diamonds"),
    ];
    expect(getScoringCards(cards, "Royal Flush")).toEqual(cards);
  });

  test("Full House returns all 5 cards", () => {
    const cards = [
      card("J", "spades"),
      card("J", "hearts"),
      card("J", "clubs"),
      card("4", "spades"),
      card("4", "hearts"),
    ];
    expect(getScoringCards(cards, "Full House")).toEqual(cards);
  });
});

describe("scoreHand — computed scores", () => {
  test("empty hand scores 0", () => {
    expect(scoreHand([])).toBe(0);
  });

  test("High Card scores only the highest card plus base chips", () => {
    // High Card: chips=5, mult=1; highest = K (10). (5 + 10) * 1 = 15
    expect(scoreHand([card("3", "spades"), card("K", "hearts")])).toBe(15);
  });

  test("High Card with an Ace uses A=11 for the scoring card", () => {
    // (5 + 11) * 1 = 16
    expect(scoreHand([card("A", "spades"), card("2", "hearts")])).toBe(16);
  });

  test("Pair scores only the paired cards and ignores the kicker", () => {
    // Pair: chips=10, mult=2. Two aces + 3 kicker. (10 + 11 + 11) * 2 = 64
    expect(
      scoreHand([
        card("A", "spades"),
        card("A", "hearts"),
        card("3", "clubs"),
      ]),
    ).toBe(64);
  });

  test("Three of a Kind scores only the trio", () => {
    // Three of a Kind: chips=30, mult=3. Three queens (Q=10 each). (30 + 30) * 3 = 180
    expect(
      scoreHand([
        card("Q", "spades"),
        card("Q", "hearts"),
        card("Q", "clubs"),
      ]),
    ).toBe(180);
  });

  test("Flush scores all 5 flush cards", () => {
    // Flush: chips=35, mult=4. 2+5+7+9+10 = 33. (35 + 33) * 4 = 272
    expect(
      scoreHand([
        card("2", "hearts"),
        card("5", "hearts"),
        card("7", "hearts"),
        card("9", "hearts"),
        card("J", "hearts"),
      ]),
    ).toBe(272);
  });

  test("Straight scores all 5 straight cards", () => {
    // Straight: chips=30, mult=4. 5+6+7+8+9 = 35. (30 + 35) * 4 = 260
    expect(
      scoreHand([
        card("5", "spades"),
        card("6", "hearts"),
        card("7", "clubs"),
        card("8", "diamonds"),
        card("9", "spades"),
      ]),
    ).toBe(260);
  });

  test("Full House scores all 5 cards", () => {
    // Full House: chips=40, mult=4. J+J+J+4+4 = 38. (40 + 38) * 4 = 312
    expect(
      scoreHand([
        card("J", "spades"),
        card("J", "hearts"),
        card("J", "clubs"),
        card("4", "spades"),
        card("4", "hearts"),
      ]),
    ).toBe(312);
  });

  test("Royal Flush scores all 5 royal cards", () => {
    // Royal Flush: chips=100, mult=8. 10+10+10+10+11 = 51. (100 + 51) * 8 = 1208
    expect(
      scoreHand([
        card("10", "diamonds"),
        card("J", "diamonds"),
        card("Q", "diamonds"),
        card("K", "diamonds"),
        card("A", "diamonds"),
      ]),
    ).toBe(1208);
  });
});

describe("per-card scoring iteration order", () => {
  const sample = (): Card[] => [
    card("3", "spades"),
    card("7", "hearts"),
    card("K", "diamonds"),
  ];

  function chipsOf(cards: ReadonlyArray<Card>): number[] {
    const seen: number[] = [];
    forEachScoringStep(cards, (entry) => seen.push(entry.chips));
    return seen;
  }

  test("getScoringStep returns the card at the requested index", () => {
    const cards = sample();
    expect(getScoringStep(cards, 1).card).toBe(cards[1]);
  });

  test("getScoringStep returns the chip value for that card", () => {
    expect(getScoringStep(sample(), 1).chips).toBe(getRankChips("7"));
  });

  test("getScoringStep rejects negative indices", () => {
    expect(() => getScoringStep(sample(), -1)).toThrow(RangeError);
  });

  test("getScoringStep rejects indices past the end", () => {
    expect(() => getScoringStep(sample(), 3)).toThrow(RangeError);
  });

  test("forEachScoringStep emits indices 0..N-1 in ascending order", () => {
    const indices: number[] = [];
    forEachScoringStep(sample(), (_entry, i) => indices.push(i));
    expect(indices).toEqual([0, 1, 2]);
  });

  test("forEachScoringStep visits [3♠, 7♥, K♦] in that rank order", () => {
    const ranks: Rank[] = [];
    forEachScoringStep(sample(), (entry) => ranks.push(entry.card.rank));
    expect(ranks).toEqual(["3", "7", "K"]);
  });

  test("forEachScoringStep emits chip values in input order", () => {
    expect(chipsOf(sample())).toEqual([3, 7, 10]);
  });

  test("reversed input emits the reversed chip-value sequence", () => {
    expect(chipsOf(sample().reverse())).toEqual([10, 7, 3]);
  });

  test("shuffled input emits chips in input order, not sorted", () => {
    const shuffled = [
      card("7", "hearts"),
      card("K", "diamonds"),
      card("3", "spades"),
    ];
    expect(chipsOf(shuffled)).toEqual([7, 10, 3]);
  });

  test("duplicate ranks emit duplicate chip values in input order", () => {
    const cards = [
      card("5", "spades"),
      card("K", "hearts"),
      card("5", "diamonds"),
    ];
    expect(chipsOf(cards)).toEqual([5, 10, 5]);
  });

  test("forEachScoringStep invokes the callback once per card", () => {
    const spy = vi.fn();
    forEachScoringStep(sample(), spy);
    expect(spy).toHaveBeenCalledTimes(3);
  });

  test("forEachScoringStep passes cards to the spy in input order", () => {
    const cards = sample();
    const spy = vi.fn();
    forEachScoringStep(cards, spy);
    const seen = spy.mock.calls.map(
      (args) => (args[0] as ScoringStep).card,
    );
    expect(seen).toEqual(cards);
  });

  test("empty input does not invoke the callback", () => {
    const spy = vi.fn();
    forEachScoringStep([], spy);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("getCardChips — Bonus enhancement", () => {
  test("returns rank chips plus 30 for a Bonus card", () => {
    expect(getCardChips(card("5", "spades", "bonus"))).toBe(5 + 30);
  });

  test("returns rank chips alone for a vanilla card", () => {
    expect(getCardChips(card("5", "spades"))).toBe(5);
  });

  test("Bonus on a face card returns 10 + 30 = 40", () => {
    expect(getCardChips(card("K", "spades", "bonus"))).toBe(40);
  });

  test("Bonus on an Ace returns 11 + 30 = 41", () => {
    expect(getCardChips(card("A", "spades", "bonus"))).toBe(41);
  });
});

describe("scoreHand — Bonus enhancement", () => {
  test("a played Pair with one Bonus card scores 30 more than the vanilla version", () => {
    const bonusHand = [
      card("5", "spades", "bonus"),
      card("5", "hearts"),
      card("9", "clubs"),
      card("7", "diamonds"),
      card("2", "spades"),
    ];
    const vanillaHand = [
      card("5", "spades"),
      card("5", "hearts"),
      card("9", "clubs"),
      card("7", "diamonds"),
      card("2", "spades"),
    ];
    expect(scoreHand(bonusHand) - scoreHand(vanillaHand)).toBe(30 * 2);
  });

  test("a Bonus card not in the scoring set contributes 0 chips (kicker on a Pair)", () => {
    const handWithBonusKicker = [
      card("5", "spades"),
      card("5", "hearts"),
      card("9", "clubs", "bonus"),
      card("7", "diamonds"),
      card("2", "spades"),
    ];
    const vanillaHand = [
      card("5", "spades"),
      card("5", "hearts"),
      card("9", "clubs"),
      card("7", "diamonds"),
      card("2", "spades"),
    ];
    expect(scoreHand(handWithBonusKicker)).toBe(scoreHand(vanillaHand));
  });
});

describe("getScoringStep — Bonus enhancement", () => {
  test("layers +30 chips onto the step for a Bonus card", () => {
    const step = getScoringStep([card("5", "spades", "bonus")], 0);
    expect(step.chips).toBe(35);
  });
});
