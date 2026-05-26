// @vitest-environment node
import {
  detectHandLabel,
  evaluateHand,
  handContains,
  type HandLabel,
} from "./handEvaluator";
import type { Card, Enhancement, Rank, Suit } from "../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit, enhancement?: Enhancement): Card {
  return enhancement
    ? { id: ++nextId, rank, suit, enhancement }
    : { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("detectHandLabel — empty / minimal", () => {
  test("empty selection is High Card", () => {
    expect(detectHandLabel([])).toBe("High Card");
  });

  test("single card is High Card", () => {
    expect(detectHandLabel([card("A", "spades")])).toBe("High Card");
  });

  test("two mismatched cards is High Card", () => {
    expect(
      detectHandLabel([card("A", "spades"), card("K", "hearts")])
    ).toBe("High Card");
  });
});

describe("detectHandLabel — pairs and groups", () => {
  test("two of same rank is a Pair", () => {
    expect(
      detectHandLabel([card("A", "spades"), card("A", "hearts")])
    ).toBe("Pair");
  });

  test("two pairs is Two Pair", () => {
    expect(
      detectHandLabel([
        card("A", "spades"),
        card("A", "hearts"),
        card("K", "spades"),
        card("K", "hearts"),
      ])
    ).toBe("Two Pair");
  });

  test("three of same rank is Three of a Kind", () => {
    expect(
      detectHandLabel([
        card("Q", "spades"),
        card("Q", "hearts"),
        card("Q", "clubs"),
      ])
    ).toBe("Three of a Kind");
  });

  test("four of same rank is Four of a Kind", () => {
    expect(
      detectHandLabel([
        card("9", "spades"),
        card("9", "hearts"),
        card("9", "clubs"),
        card("9", "diamonds"),
      ])
    ).toBe("Four of a Kind");
  });

  test("five of same rank is Five of a Kind", () => {
    expect(
      detectHandLabel([
        card("7", "spades"),
        card("7", "hearts"),
        card("7", "clubs"),
        card("7", "diamonds"),
        card("7", "spades"),
      ])
    ).toBe("Five of a Kind");
  });
});

describe("detectHandLabel — full house", () => {
  test("three of a kind plus a pair is a Full House", () => {
    expect(
      detectHandLabel([
        card("J", "spades"),
        card("J", "hearts"),
        card("J", "clubs"),
        card("4", "spades"),
        card("4", "hearts"),
      ])
    ).toBe("Full House");
  });
});

describe("detectHandLabel — straight", () => {
  test("five consecutive ranks of mixed suits is a Straight", () => {
    expect(
      detectHandLabel([
        card("5", "spades"),
        card("6", "hearts"),
        card("7", "clubs"),
        card("8", "diamonds"),
        card("9", "spades"),
      ])
    ).toBe("Straight");
  });

  test("ace-low straight (A-2-3-4-5) is a Straight", () => {
    expect(
      detectHandLabel([
        card("A", "spades"),
        card("2", "hearts"),
        card("3", "clubs"),
        card("4", "diamonds"),
        card("5", "spades"),
      ])
    ).toBe("Straight");
  });

  test("four consecutive ranks is not a Straight", () => {
    expect(
      detectHandLabel([
        card("5", "spades"),
        card("6", "hearts"),
        card("7", "clubs"),
        card("8", "diamonds"),
      ])
    ).toBe("High Card");
  });

  test("non-consecutive ranks with one gap is not a Straight", () => {
    expect(
      detectHandLabel([
        card("5", "spades"),
        card("6", "hearts"),
        card("8", "clubs"),
        card("9", "diamonds"),
        card("10", "spades"),
      ])
    ).toBe("High Card");
  });
});

describe("detectHandLabel — flush", () => {
  test("five cards of the same suit is a Flush", () => {
    expect(
      detectHandLabel([
        card("2", "hearts"),
        card("5", "hearts"),
        card("7", "hearts"),
        card("9", "hearts"),
        card("J", "hearts"),
      ])
    ).toBe("Flush");
  });

  test("four cards of the same suit is not a Flush", () => {
    expect(
      detectHandLabel([
        card("2", "hearts"),
        card("5", "hearts"),
        card("7", "hearts"),
        card("9", "hearts"),
      ])
    ).toBe("High Card");
  });
});

describe("detectHandLabel — straight flush family", () => {
  test("consecutive same-suit cards is a Straight Flush", () => {
    expect(
      detectHandLabel([
        card("5", "spades"),
        card("6", "spades"),
        card("7", "spades"),
        card("8", "spades"),
        card("9", "spades"),
      ])
    ).toBe("Straight Flush");
  });

  test("A-K-Q-J-10 of the same suit is a Royal Flush", () => {
    expect(
      detectHandLabel([
        card("10", "diamonds"),
        card("J", "diamonds"),
        card("Q", "diamonds"),
        card("K", "diamonds"),
        card("A", "diamonds"),
      ])
    ).toBe("Royal Flush");
  });
});

describe("detectHandLabel — flush variants", () => {
  test("five same-rank same-suit cards is Flush Five", () => {
    expect(
      detectHandLabel([
        card("8", "clubs"),
        card("8", "clubs"),
        card("8", "clubs"),
        card("8", "clubs"),
        card("8", "clubs"),
      ])
    ).toBe("Flush Five");
  });

  test("Full House where every card shares a suit is a Flush House", () => {
    expect(
      detectHandLabel([
        card("K", "hearts"),
        card("K", "hearts"),
        card("K", "hearts"),
        card("3", "hearts"),
        card("3", "hearts"),
      ])
    ).toBe("Flush House");
  });
});

describe("evaluateHand", () => {
  test("returns the Hand object with chips and multiplier for the detected label", () => {
    const result = evaluateHand([
      card("A", "spades"),
      card("A", "hearts"),
    ]);
    expect(result.label).toBe("Pair");
  });

  test("returns chips matching the detected hand definition", () => {
    const result = evaluateHand([
      card("A", "spades"),
      card("A", "hearts"),
    ]);
    expect(result.chips).toBe(10);
  });

  test("returns multiplier matching the detected hand definition", () => {
    const result = evaluateHand([
      card("A", "spades"),
      card("A", "hearts"),
    ]);
    expect(result.multiplier).toBe(2);
  });
});

describe("handContains", () => {
  test.each<{ outer: HandLabel; inner: HandLabel; expected: boolean }>([
    { outer: "Full House", inner: "Pair", expected: true },
    { outer: "Full House", inner: "Three of a Kind", expected: true },
    { outer: "Full House", inner: "Straight", expected: false },
    { outer: "Two Pair", inner: "Pair", expected: true },
    { outer: "Pair", inner: "Two Pair", expected: false },
    { outer: "Four of a Kind", inner: "Three of a Kind", expected: true },
    { outer: "Straight Flush", inner: "Straight", expected: true },
    { outer: "Straight Flush", inner: "Flush", expected: true },
    { outer: "Flush House", inner: "Full House", expected: true },
    { outer: "Flush Five", inner: "Flush", expected: true },
    { outer: "Flush", inner: "Straight", expected: false },
    { outer: "Straight", inner: "Flush", expected: false },
  ])("handContains($outer, $inner) is $expected", ({ outer, inner, expected }) => {
    expect(handContains(outer, inner)).toBe(expected);
  });
});

describe("detectHandLabel — Wild enhancement promotes suit-based hands", () => {
  test("four hearts plus one Wild non-heart detects as a Flush", () => {
    expect(
      detectHandLabel([
        card("2", "hearts"),
        card("5", "hearts"),
        card("9", "hearts"),
        card("J", "hearts"),
        card("K", "clubs", "wild"),
      ]),
    ).toBe("Flush");
  });

  test("a straight whose non-Wild cards share a suit detects as a Straight Flush", () => {
    expect(
      detectHandLabel([
        card("5", "spades"),
        card("6", "spades"),
        card("7", "spades"),
        card("8", "spades"),
        card("9", "diamonds", "wild"),
      ]),
    ).toBe("Straight Flush");
  });

  test("five Wild cards always count as a Flush (every suit collapses)", () => {
    expect(
      detectHandLabel([
        card("2", "spades", "wild"),
        card("5", "hearts", "wild"),
        card("9", "diamonds", "wild"),
        card("J", "clubs", "wild"),
        card("K", "spades", "wild"),
      ]),
    ).toBe("Flush");
  });

  test("Wild does not turn a non-suit hand into a Flush (3 hearts + 1 club + 1 Wild diamond)", () => {
    expect(
      detectHandLabel([
        card("2", "hearts"),
        card("5", "hearts"),
        card("9", "hearts"),
        card("J", "clubs"),
        card("K", "diamonds", "wild"),
      ]),
    ).toBe("High Card");
  });

  test("a Wild card on a Pair scores the same hand label as the vanilla equivalent (no Flush)", () => {
    const wild = detectHandLabel([
      card("5", "spades", "wild"),
      card("5", "hearts"),
      card("9", "clubs"),
      card("J", "diamonds"),
      card("K", "hearts"),
    ]);
    const vanilla = detectHandLabel([
      card("5", "spades"),
      card("5", "hearts"),
      card("9", "clubs"),
      card("J", "diamonds"),
      card("K", "hearts"),
    ]);
    expect(wild).toBe(vanilla);
  });
});

describe("detectHandLabel — Stone enhancement is invisible to rank/suit detection", () => {
  test("[Stone, Stone, Stone, 5d, 5h] detects as a Pair from the two 5s", () => {
    expect(
      detectHandLabel([
        card("3", "spades", "stone"),
        card("3", "hearts", "stone"),
        card("3", "clubs", "stone"),
        card("5", "diamonds"),
        card("5", "hearts"),
      ]),
    ).toBe("Pair");
  });

  test("[Stone, Stone, K, K, K] detects as Three of a Kind, not Four of a Kind", () => {
    expect(
      detectHandLabel([
        card("3", "spades", "stone"),
        card("3", "hearts", "stone"),
        card("K", "clubs"),
        card("K", "diamonds"),
        card("K", "hearts"),
      ]),
    ).toBe("Three of a Kind");
  });

  test("[Stone, 4h, 5h, 6h, 7h] does NOT detect as a Flush (only 4 hearts)", () => {
    expect(
      detectHandLabel([
        card("3", "spades", "stone"),
        card("4", "hearts"),
        card("5", "hearts"),
        card("6", "hearts"),
        card("7", "hearts"),
      ]),
    ).toBe("High Card");
  });

  test("[Stone] alone detects as High Card", () => {
    expect(detectHandLabel([card("3", "spades", "stone")])).toBe("High Card");
  });

  test("a pure-Stone 5-card hand detects as High Card (no rank or suit structure)", () => {
    expect(
      detectHandLabel([
        card("3", "spades", "stone"),
        card("3", "hearts", "stone"),
        card("3", "clubs", "stone"),
        card("3", "diamonds", "stone"),
        card("K", "hearts", "stone"),
      ]),
    ).toBe("High Card");
  });
});
