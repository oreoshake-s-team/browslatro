// @vitest-environment node
import {
  RESERVED_PARKING_PAYOUT,
  applyHandLevelJokers,
  applyPerCardJokers,
  createReservedParkingJoker,
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

const alwaysProc = (): number => 0;
const neverProc = (): number => 0.99;

describe("Reserved Parking", () => {
  test("pays RESERVED_PARKING_PAYOUT per held face card when every roll procs", () => {
    const result = applyHandLevelJokers([createReservedParkingJoker()], {
      heldInHandCards: [card("J"), card("Q"), card("K")],
      rng: alwaysProc,
    });
    expect(result.moneyEarned).toBe(RESERVED_PARKING_PAYOUT * 3);
  });

  test("reports Reserved Parking as fired when at least one held face procs", () => {
    const result = applyHandLevelJokers([createReservedParkingJoker()], {
      heldInHandCards: [card("J")],
      rng: alwaysProc,
    });
    expect(result.firedJokerIds).toEqual(["reserved-parking"]);
  });

  test("pays nothing when no roll procs", () => {
    const result = applyHandLevelJokers([createReservedParkingJoker()], {
      heldInHandCards: [card("J"), card("Q"), card("K")],
      rng: neverProc,
    });
    expect(result.moneyEarned).toBe(0);
  });

  test("does not fire when no roll procs", () => {
    const result = applyHandLevelJokers([createReservedParkingJoker()], {
      heldInHandCards: [card("J"), card("Q"), card("K")],
      rng: neverProc,
    });
    expect(result.firedJokerIds).toEqual([]);
  });

  test("ignores non-face held cards even when rolls would proc", () => {
    const result = applyHandLevelJokers([createReservedParkingJoker()], {
      heldInHandCards: [card("2"), card("5"), card("A")],
      rng: alwaysProc,
    });
    expect(result.moneyEarned).toBe(0);
  });

  test("ignores face cards that are scored rather than held", () => {
    const result = applyHandLevelJokers([createReservedParkingJoker()], {
      scoredCards: [card("J"), card("Q"), card("K")],
      heldInHandCards: [],
      rng: alwaysProc,
    });
    expect(result.moneyEarned).toBe(0);
  });

  test("pays only on the face cards in a mixed held hand", () => {
    const result = applyHandLevelJokers([createReservedParkingJoker()], {
      heldInHandCards: [card("J"), card("2"), card("K"), card("A")],
      rng: alwaysProc,
    });
    expect(result.moneyEarned).toBe(RESERVED_PARKING_PAYOUT * 2);
  });

  test("rolls independently per held face using the provided RNG sequence", () => {
    const rolls = [0.1, 0.9, 0.1];
    let i = 0;
    const rng = (): number => {
      const value = rolls[i];
      i += 1;
      return value;
    };
    const result = applyHandLevelJokers([createReservedParkingJoker()], {
      heldInHandCards: [card("J"), card("Q"), card("K")],
      rng,
    });
    expect(result.moneyEarned).toBe(RESERVED_PARKING_PAYOUT * 2);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers([createReservedParkingJoker()], card("K"));
    expect(result.firedJokerIds).toEqual([]);
  });

  test("is a common joker", () => {
    expect(createReservedParkingJoker().rarity).toBe<JokerRarity>("common");
  });
});
