// @vitest-environment node
import {
  createFourFingersJoker,
  createBusinessCardJoker,
  handEvalOptionsFromJokers,
  type JokerRarity,
} from "../jokers";
import { detectHandLabel } from "../../scoring/handEvaluator";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank = "5", suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Four Fingers", () => {
  test("is a common joker", () => {
    expect(createFourFingersJoker().rarity).toBe<JokerRarity>("common");
  });

  test("description mentions 4 cards", () => {
    expect(createFourFingersJoker().description).toMatch(/4 cards/);
  });

  test("handEvalOptionsFromJokers picks up the fourFingers flag", () => {
    expect(handEvalOptionsFromJokers([createFourFingersJoker()])).toEqual({
      fourFingers: true,
    });
  });
});

describe("detectHandLabel with Four Fingers", () => {
  function cards(
    specs: ReadonlyArray<readonly [Rank, Suit]>,
  ): ReadonlyArray<Card> {
    return specs.map(([r, s]) => card(r, s));
  }

  const OPT = { fourFingers: true } as const;

  test("4-card same-suit hand is labeled Flush", () => {
    const hand = cards([
      ["2", "spades"],
      ["6", "spades"],
      ["9", "spades"],
      ["K", "spades"],
    ]);
    expect(detectHandLabel(hand, OPT)).toBe("Flush");
  });

  test("4-card consecutive ranks is labeled Straight", () => {
    const hand = cards([
      ["5", "spades"],
      ["6", "hearts"],
      ["7", "diamonds"],
      ["8", "clubs"],
    ]);
    expect(detectHandLabel(hand, OPT)).toBe("Straight");
  });

  test("4-card same-suit consecutive ranks is labeled Straight Flush", () => {
    const hand = cards([
      ["5", "spades"],
      ["6", "spades"],
      ["7", "spades"],
      ["8", "spades"],
    ]);
    expect(detectHandLabel(hand, OPT)).toBe("Straight Flush");
  });

  test("J-Q-K-A same-suit is labeled Royal Flush", () => {
    const hand = cards([
      ["J", "spades"],
      ["Q", "spades"],
      ["K", "spades"],
      ["A", "spades"],
    ]);
    expect(detectHandLabel(hand, OPT)).toBe("Royal Flush");
  });

  test("A-2-3-4 (ace-low) is labeled Straight", () => {
    const hand = cards([
      ["A", "spades"],
      ["2", "hearts"],
      ["3", "diamonds"],
      ["4", "clubs"],
    ]);
    expect(detectHandLabel(hand, OPT)).toBe("Straight");
  });

  test("WITHOUT Four Fingers, 4-card same-suit is not labeled Flush (negative)", () => {
    const hand = cards([
      ["2", "spades"],
      ["6", "spades"],
      ["9", "spades"],
      ["K", "spades"],
    ]);
    expect(detectHandLabel(hand)).toBe("High Card");
  });

  test("WITHOUT Four Fingers, 4-card consecutive ranks is not labeled Straight (negative)", () => {
    const hand = cards([
      ["5", "spades"],
      ["6", "hearts"],
      ["7", "diamonds"],
      ["8", "clubs"],
    ]);
    expect(detectHandLabel(hand)).toBe("High Card");
  });

  test("5 cards with 4 same-suit + 1 off-suit is labeled Flush (#832)", () => {
    const hand = cards([
      ["A", "hearts"],
      ["7", "diamonds"],
      ["5", "diamonds"],
      ["2", "diamonds"],
      ["9", "diamonds"],
    ]);
    expect(detectHandLabel(hand, OPT)).toBe("Flush");
  });

  test("5 cards with 4 in a run + 1 outlier is labeled Straight (#832)", () => {
    const hand = cards([
      ["3", "hearts"],
      ["4", "spades"],
      ["5", "diamonds"],
      ["6", "clubs"],
      ["K", "hearts"],
    ]);
    expect(detectHandLabel(hand, OPT)).toBe("Straight");
  });

  test("5 cards with 4 same-suit J-Q-K-A + 1 outlier is labeled Royal Flush (#832)", () => {
    const hand = cards([
      ["J", "spades"],
      ["Q", "spades"],
      ["K", "spades"],
      ["A", "spades"],
      ["5", "hearts"],
    ]);
    expect(detectHandLabel(hand, OPT)).toBe("Royal Flush");
  });

  test("5 cards with 3 same-suit + 2 off-suit stays High Card (negative, #832)", () => {
    const hand = cards([
      ["A", "hearts"],
      ["K", "hearts"],
      ["7", "diamonds"],
      ["5", "diamonds"],
      ["2", "diamonds"],
    ]);
    expect(detectHandLabel(hand, OPT)).toBe("High Card");
  });

  test("Flush House still requires all 5 cards same suit (regression)", () => {
    const hand = cards([
      ["3", "diamonds"],
      ["3", "diamonds"],
      ["3", "diamonds"],
      ["7", "diamonds"],
      ["7", "hearts"],
    ]);
    expect(detectHandLabel(hand, OPT)).toBe("Full House");
  });
});

describe("handEvalOptionsFromJokers", () => {
  test("returns empty object when no relevant jokers are equipped (negative)", () => {
    expect(handEvalOptionsFromJokers([createBusinessCardJoker()])).toEqual({});
  });

  test("returns empty object for an empty slate", () => {
    expect(handEvalOptionsFromJokers([])).toEqual({});
  });
});
