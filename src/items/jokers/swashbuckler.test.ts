// @vitest-environment node
import {
  JOKER_SELL_VALUE,
  applyHandLevelJokers,
  applyPerCardJokers,
  createPlusFourMultJoker,
  createSwashbucklerJoker,
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

describe("Swashbuckler", () => {
  test("adds the sell value of one other equipped joker to additive mult", () => {
    const result = applyHandLevelJokers([
      createSwashbucklerJoker(),
      createPlusFourMultJoker(),
    ]);
    const plusFour = 4;
    expect(result.additiveMult).toBe(JOKER_SELL_VALUE + plusFour);
  });

  test("sums sell value across multiple other jokers", () => {
    const result = applyHandLevelJokers([
      createSwashbucklerJoker(),
      createPlusFourMultJoker(),
      createPlusFourMultJoker(),
    ]);
    const plusFourTwice = 4 + 4;
    expect(result.additiveMult).toBe(JOKER_SELL_VALUE * 2 + plusFourTwice);
  });

  test("adds nothing when Swashbuckler is the only equipped joker", () => {
    const result = applyHandLevelJokers([createSwashbucklerJoker()]);
    expect(result.additiveMult).toBe(0);
  });

  test("does not fire when Swashbuckler is the only equipped joker", () => {
    const result = applyHandLevelJokers([createSwashbucklerJoker()]);
    expect(result.firedJokerIds).toEqual([]);
  });

  test("two Swashbucklers each see the other's sell value", () => {
    const result = applyHandLevelJokers([
      createSwashbucklerJoker(),
      createSwashbucklerJoker(),
    ]);
    expect(result.additiveMult).toBe(JOKER_SELL_VALUE * 2);
  });

  test("does not include its own sell value in the bonus", () => {
    const result = applyHandLevelJokers([
      createSwashbucklerJoker(),
      createPlusFourMultJoker(),
    ]);
    const plusFour = 4;
    expect(result.additiveMult - plusFour).toBe(JOKER_SELL_VALUE);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers(
      [createSwashbucklerJoker(), createPlusFourMultJoker()],
      card("5"),
    );
    expect(result.firedJokerIds).toEqual([]);
  });

  test("is a common joker", () => {
    expect(createSwashbucklerJoker().rarity).toBe<JokerRarity>("common");
  });
});
