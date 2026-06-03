// @vitest-environment node
import {
  ABSTRACT_JOKER_MULT_PER_JOKER,
  applyHandLevelJokers,
  applyPerCardJokers,
  createAbstractJoker,
  createPlusFourMultJoker,
  withEdition,
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

describe("Abstract Joker", () => {
  test("adds ABSTRACT_JOKER_MULT_PER_JOKER per equipped joker (counts itself)", () => {
    const result = applyHandLevelJokers([createAbstractJoker()]);
    expect(result.additiveMult).toBe(ABSTRACT_JOKER_MULT_PER_JOKER);
  });

  test("scales with the joker count when other jokers are also equipped", () => {
    const result = applyHandLevelJokers([
      createAbstractJoker(),
      createPlusFourMultJoker(),
    ]);
    const abstractContribution = ABSTRACT_JOKER_MULT_PER_JOKER * 2;
    const plusFourContribution = 4;
    expect(result.additiveMult).toBe(abstractContribution + plusFourContribution);
  });

  test("counts a Negative-edition joker toward the joker count too", () => {
    const result = applyHandLevelJokers([
      createAbstractJoker(),
      withEdition(createPlusFourMultJoker(), "negative"),
    ]);
    const abstractContribution = ABSTRACT_JOKER_MULT_PER_JOKER * 2;
    const plusFourContribution = 4;
    expect(result.additiveMult).toBe(abstractContribution + plusFourContribution);
  });

  test("fires once for the Abstract Joker itself", () => {
    const result = applyHandLevelJokers([createAbstractJoker()]);
    expect(result.firedJokerIds).toEqual(["abstract-joker"]);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers([createAbstractJoker()], card("K"));
    expect(result.firedJokerIds).toEqual([]);
  });

  test("is a common joker", () => {
    expect(createAbstractJoker().rarity).toBe<JokerRarity>("common");
  });
});
