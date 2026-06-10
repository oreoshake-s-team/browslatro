// @vitest-environment node
import {
  CANIO_X_MULT_PER_FACE,
  applyCardsDestroyedToJokerStates,
  applyHandLevelJokers,
  createCanioJoker,
  createJokerCatalog,
  createLegendaryJokerCatalog,
  createPareidoliaJoker,
} from "../jokers";
import type { JokerRarity } from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Canio (#1037)", () => {
  test("is registered in the legendary pool", () => {
    const ids = createLegendaryJokerCatalog().map((j) => j.id);
    expect(ids).toContain("canio");
  });

  test("is not in the regular shop catalog (negative)", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).not.toContain("canio");
  });

  test("has legendary rarity", () => {
    expect(createCanioJoker().rarity).toBe<JokerRarity>("legendary");
  });

  test("a destroyed face card grows the x-mult counter", () => {
    const jokers = applyCardsDestroyedToJokerStates(
      [createCanioJoker()],
      [card("K")],
    );
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "Pair" });
    expect(result.xMult).toBe(1 + CANIO_X_MULT_PER_FACE);
  });

  test("multiple destroyed faces stack in one pass", () => {
    const jokers = applyCardsDestroyedToJokerStates(
      [createCanioJoker()],
      [card("K"), card("Q"), card("J")],
    );
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "Pair" });
    expect(result.xMult).toBe(1 + 3 * CANIO_X_MULT_PER_FACE);
  });

  test("counts non-face destructions when Pareidolia is held", () => {
    const jokers = applyCardsDestroyedToJokerStates(
      [createCanioJoker(), createPareidoliaJoker()],
      [card("5")],
    );
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "Pair" });
    expect(result.xMult).toBe(1 + CANIO_X_MULT_PER_FACE);
  });

  test("a destroyed non-face card does not feed Canio (negative)", () => {
    const jokers = applyCardsDestroyedToJokerStates(
      [createCanioJoker()],
      [card("5")],
    );
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "Pair" });
    expect(result.xMult).toBe(1);
  });

  test("an empty destruction list is a no-op (negative)", () => {
    const jokers = applyCardsDestroyedToJokerStates([createCanioJoker()], []);
    expect(jokers[0].state).toEqual({ kind: "counter", value: 0 });
  });
});
