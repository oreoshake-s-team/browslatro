// @vitest-environment node
import {
  createHackJoker,
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

describe("Hack", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("hack");
  });

  test("retriggers a played 2 once", () => {
    const two = card("2");
    const scoring = expandScoringRetriggers([two], [createHackJoker()]);
    expect(scoring).toEqual([two, two]);
  });

  test("retriggers each of 2, 3, 4, and 5", () => {
    const cards = [card("2"), card("3"), card("4"), card("5")];
    const scoring = expandScoringRetriggers(cards, [createHackJoker()]);
    expect(scoring).toHaveLength(8);
  });

  test("does not retrigger other ranks (negative)", () => {
    const ace = card("A");
    const scoring = expandScoringRetriggers([ace], [createHackJoker()]);
    expect(scoring).toEqual([ace]);
  });

  test("stacks additively with a red seal", () => {
    const sealedTwo: Card = { ...card("2"), seal: "red" };
    const scoring = expandScoringRetriggers([sealedTwo], [createHackJoker()]);
    expect(scoring).toHaveLength(3);
  });

  test("two Hacks retrigger a matching card twice", () => {
    const two = card("2");
    const scoring = expandScoringRetriggers(
      [two],
      [createHackJoker(), createHackJoker()],
    );
    expect(scoring).toHaveLength(3);
  });
});
