// @vitest-environment node
import {
  createJokerCatalog,
  createPareidoliaJoker,
  createSockAndBuskinJoker,
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

describe("Sock and Buskin", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("sock-and-buskin");
  });

  test("retriggers a played King once", () => {
    const king = card("K");
    const scoring = expandScoringRetriggers(
      [king],
      [createSockAndBuskinJoker()],
    );
    expect(scoring).toEqual([king, king]);
  });

  test("retriggers every face card in the hand", () => {
    const cards = [card("J"), card("Q"), card("K")];
    const scoring = expandScoringRetriggers(cards, [
      createSockAndBuskinJoker(),
    ]);
    expect(scoring).toHaveLength(6);
  });

  test("does not retrigger non-face cards (negative)", () => {
    const cards = [card("A"), card("7")];
    const scoring = expandScoringRetriggers(cards, [
      createSockAndBuskinJoker(),
    ]);
    expect(scoring).toHaveLength(2);
  });

  test("with Pareidolia equipped, every card counts as a face card", () => {
    const seven = card("7");
    const scoring = expandScoringRetriggers(
      [seven],
      [createSockAndBuskinJoker(), createPareidoliaJoker()],
    );
    expect(scoring).toEqual([seven, seven]);
  });
});
