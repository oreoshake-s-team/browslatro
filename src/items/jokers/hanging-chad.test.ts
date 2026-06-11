// @vitest-environment node
import {
  HANGING_CHAD_RETRIGGERS,
  createHangingChadJoker,
  createJokerCatalog,
  expandScoringRetriggers,
} from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Hanging Chad", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("hanging-chad");
  });

  test("retriggers the first scoring card 2 additional times", () => {
    const first = card("A");
    const scoring = expandScoringRetriggers(
      [first, card("K")],
      [createHangingChadJoker()],
    );
    expect(scoring.filter((c) => c.id === first.id)).toHaveLength(
      1 + HANGING_CHAD_RETRIGGERS,
    );
  });

  test("leaves the other scoring cards untouched (negative)", () => {
    const second = card("K");
    const scoring = expandScoringRetriggers(
      [card("A"), second],
      [createHangingChadJoker()],
    );
    expect(scoring.filter((c) => c.id === second.id)).toHaveLength(1);
  });

  test("stacks additively with a red seal on the first card", () => {
    const sealed: Card = { ...card("A"), seal: "red" };
    const scoring = expandScoringRetriggers(
      [sealed],
      [createHangingChadJoker()],
    );
    expect(scoring).toHaveLength(1 + HANGING_CHAD_RETRIGGERS + 1);
  });

  test("does nothing with no scoring cards (negative)", () => {
    expect(expandScoringRetriggers([], [createHangingChadJoker()])).toEqual([]);
  });
});
