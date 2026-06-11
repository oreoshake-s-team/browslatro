// @vitest-environment node
import {
  createDuskJoker,
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

describe("Dusk", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("dusk");
  });

  test("retriggers every played card on the final hand", () => {
    const cards = [card("A"), card("K")];
    const scoring = expandScoringRetriggers(cards, [createDuskJoker()], {
      remainingHands: 1,
    });
    expect(scoring).toHaveLength(4);
  });

  test("does nothing when more hands remain (negative)", () => {
    const cards = [card("A"), card("K")];
    const scoring = expandScoringRetriggers(cards, [createDuskJoker()], {
      remainingHands: 3,
    });
    expect(scoring).toHaveLength(2);
  });

  test("does nothing when remainingHands is not provided (negative)", () => {
    const cards = [card("A")];
    const scoring = expandScoringRetriggers(cards, [createDuskJoker()]);
    expect(scoring).toHaveLength(1);
  });

  test("stacks additively with a red seal on the final hand", () => {
    const sealed: Card = { ...card("A"), seal: "red" };
    const scoring = expandScoringRetriggers([sealed], [createDuskJoker()], {
      remainingHands: 1,
    });
    expect(scoring).toHaveLength(3);
  });
});
