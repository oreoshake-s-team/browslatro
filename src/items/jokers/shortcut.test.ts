// @vitest-environment node
import {
  createShortcutJoker,
  createFourFingersJoker,
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

describe("Shortcut", () => {
  test("is an uncommon joker", () => {
    expect(createShortcutJoker().rarity).toBe<JokerRarity>("uncommon");
  });

  test("description mentions 1 rank apart", () => {
    expect(createShortcutJoker().description).toMatch(/1 rank apart/);
  });

  test("handEvalOptionsFromJokers picks up the shortcut flag", () => {
    expect(handEvalOptionsFromJokers([createShortcutJoker()])).toEqual({
      shortcut: true,
    });
  });

  test("Four Fingers + Shortcut both flags are returned together", () => {
    expect(
      handEvalOptionsFromJokers([
        createShortcutJoker(),
        createFourFingersJoker(),
      ]),
    ).toEqual({ fourFingers: true, shortcut: true });
  });
});

describe("detectHandLabel with Shortcut", () => {
  function cards(
    specs: ReadonlyArray<readonly [Rank, Suit]>,
  ): ReadonlyArray<Card> {
    return specs.map(([r, s]) => card(r, s));
  }

  const OPT = { shortcut: true } as const;

  test("5-card sorted run with single gaps is labeled Straight", () => {
    const hand = cards([
      ["3", "spades"],
      ["4", "hearts"],
      ["6", "diamonds"],
      ["8", "clubs"],
      ["9", "spades"],
    ]);
    expect(detectHandLabel(hand, OPT)).toBe("Straight");
  });

  test("a gap of 2 still blocks the straight (negative)", () => {
    const hand = cards([
      ["3", "spades"],
      ["4", "hearts"],
      ["7", "diamonds"],
      ["8", "clubs"],
      ["9", "spades"],
    ]);
    expect(detectHandLabel(hand, OPT)).toBe("High Card");
  });

  test("a strictly consecutive run is still a Straight under Shortcut", () => {
    const hand = cards([
      ["5", "spades"],
      ["6", "hearts"],
      ["7", "diamonds"],
      ["8", "clubs"],
      ["9", "spades"],
    ]);
    expect(detectHandLabel(hand, OPT)).toBe("Straight");
  });

  test("WITHOUT Shortcut, the same gapped hand is not a Straight (negative)", () => {
    const hand = cards([
      ["3", "spades"],
      ["4", "hearts"],
      ["6", "diamonds"],
      ["8", "clubs"],
      ["9", "spades"],
    ]);
    expect(detectHandLabel(hand)).toBe("High Card");
  });

  test("Shortcut + 5-card same-suit gapped run is Straight Flush", () => {
    const hand = cards([
      ["3", "spades"],
      ["4", "spades"],
      ["6", "spades"],
      ["8", "spades"],
      ["9", "spades"],
    ]);
    expect(detectHandLabel(hand, OPT)).toBe("Straight Flush");
  });

  test("Shortcut + 4-card gapped run with Four Fingers is Straight", () => {
    const hand = cards([
      ["3", "spades"],
      ["5", "hearts"],
      ["7", "diamonds"],
      ["9", "clubs"],
    ]);
    expect(
      detectHandLabel(hand, { fourFingers: true, shortcut: true }),
    ).toBe("Straight");
  });

  test("Shortcut does NOT turn a strict-consecutive Royal hand into something else", () => {
    const hand = cards([
      ["10", "spades"],
      ["J", "spades"],
      ["Q", "spades"],
      ["K", "spades"],
      ["A", "spades"],
    ]);
    expect(detectHandLabel(hand, OPT)).toBe("Royal Flush");
  });
});
