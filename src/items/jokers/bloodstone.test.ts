// @vitest-environment node
import {
  BLOODSTONE_CHANCE,
  BLOODSTONE_X_MULT,
  applyHandLevelJokers,
  applyPerCardJokers,
  createBloodstoneJoker,
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

describe("Bloodstone", () => {
  test("multiplies xMult by BLOODSTONE_X_MULT on a Heart when the roll procs", () => {
    const result = applyPerCardJokers(
      [createBloodstoneJoker()],
      card("5", "hearts"),
      () => 0,
    );
    expect(result.xMult).toBe(BLOODSTONE_X_MULT);
  });

  test("reports Bloodstone as fired when the roll procs on a Heart", () => {
    const result = applyPerCardJokers(
      [createBloodstoneJoker()],
      card("5", "hearts"),
      () => 0,
    );
    expect(result.firedJokerIds).toEqual(["bloodstone"]);
  });

  test("does not multiply on a Heart when the roll fails", () => {
    const result = applyPerCardJokers(
      [createBloodstoneJoker()],
      card("5", "hearts"),
      () => 0.99,
    );
    expect(result.xMult).toBe(1);
  });

  test("does not fire on a Heart when the roll fails", () => {
    const result = applyPerCardJokers(
      [createBloodstoneJoker()],
      card("5", "hearts"),
      () => 0.99,
    );
    expect(result.firedJokerIds).toEqual([]);
  });

  test("does not multiply on a Spade even when the roll would proc", () => {
    const result = applyPerCardJokers(
      [createBloodstoneJoker()],
      card("5", "spades"),
      () => 0,
    );
    expect(result.xMult).toBe(1);
  });

  test("does not multiply on a Diamond even when the roll would proc", () => {
    const result = applyPerCardJokers(
      [createBloodstoneJoker()],
      card("5", "diamonds"),
      () => 0,
    );
    expect(result.xMult).toBe(1);
  });

  test("does not multiply on a Club even when the roll would proc", () => {
    const result = applyPerCardJokers(
      [createBloodstoneJoker()],
      card("5", "clubs"),
      () => 0,
    );
    expect(result.xMult).toBe(1);
  });

  test("does not contribute in the hand-level pass", () => {
    const result = applyHandLevelJokers([createBloodstoneJoker()]);
    expect(result.firedJokerIds).toEqual([]);
  });

  test("uses a 1-in-2 base chance", () => {
    expect(BLOODSTONE_CHANCE).toBe(0.5);
  });

  test("is an uncommon joker", () => {
    expect(createBloodstoneJoker().rarity).toBe<JokerRarity>("uncommon");
  });
});
