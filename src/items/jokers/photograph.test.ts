// @vitest-environment node
import {
  PHOTOGRAPH_X_MULT,
  applyHandLevelJokers,
  applyJokersToScoring,
  applyPerCardJokers,
  createPhotographJoker,
} from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Photograph joker", () => {
  test("multiplies xMult by PHOTOGRAPH_X_MULT when a face card is scored", () => {
    const scored = [card("J"), card("5")];
    const result = applyJokersToScoring([createPhotographJoker()], scored);
    expect(result.xMult).toBe(PHOTOGRAPH_X_MULT);
  });

  test("does not multiply xMult when no face cards are scored", () => {
    const scored = [card("2"), card("5"), card("A")];
    const result = applyJokersToScoring([createPhotographJoker()], scored);
    expect(result.xMult).toBe(1);
  });

  test("applies only once even when multiple face cards are scored", () => {
    const scored = [card("J"), card("Q"), card("K")];
    const result = applyJokersToScoring([createPhotographJoker()], scored);
    expect(result.xMult).toBe(PHOTOGRAPH_X_MULT);
  });

  test("no longer fires at the hand-level pass (moved to per-card)", () => {
    const result = applyHandLevelJokers([createPhotographJoker()], {
      scoredCards: [card("J"), card("Q")],
    });
    expect(result.firedJokerIds).not.toContain("photograph");
  });

  test("emits no hand-level step", () => {
    const result = applyHandLevelJokers([createPhotographJoker()], {
      scoredCards: [card("J"), card("Q")],
    });
    expect(result.steps).toEqual([]);
  });

  test("hand-level aggregate xMult no longer includes Photograph", () => {
    const result = applyHandLevelJokers([createPhotographJoker()], {
      scoredCards: [card("J"), card("Q")],
    });
    expect(result.xMult).toBe(1);
  });

  test("does not change additive mult", () => {
    const scored = [card("J")];
    const result = applyJokersToScoring([createPhotographJoker()], scored);
    expect(result.additiveMult).toBe(0);
  });

  test("does not change additive chips", () => {
    const scored = [card("J")];
    const result = applyJokersToScoring([createPhotographJoker()], scored);
    expect(result.additiveChips).toBe(0);
  });
});

describe("Photograph joker — per-card semantics", () => {
  test("fires per-card when a face card is scored and no face has scored yet", () => {
    const result = applyPerCardJokers([createPhotographJoker()], card("J"));
    expect(result.firedJokerIds).toEqual(["photograph"]);
  });

  test("multiplies per-card xMult by PHOTOGRAPH_X_MULT on the first face card", () => {
    const result = applyPerCardJokers([createPhotographJoker()], card("J"));
    expect(result.xMult).toBe(PHOTOGRAPH_X_MULT);
  });

  test("does not fire per-card when the card is not a face", () => {
    const result = applyPerCardJokers([createPhotographJoker()], card("5"));
    expect(result.firedJokerIds).toEqual([]);
  });

  test("does not fire per-card when a face has already scored this hand", () => {
    const result = applyPerCardJokers(
      [createPhotographJoker()],
      card("Q"),
      Math.random,
      { firstFaceAlreadyScored: true },
    );
    expect(result.firedJokerIds).toEqual([]);
  });

  test("does not multiply per-card xMult when a face has already scored", () => {
    const result = applyPerCardJokers(
      [createPhotographJoker()],
      card("Q"),
      Math.random,
      { firstFaceAlreadyScored: true },
    );
    expect(result.xMult).toBe(1);
  });

  test("applyJokersToScoring still multiplies xMult exactly once across multiple faces", () => {
    const scored = [card("J"), card("Q"), card("K")];
    const result = applyJokersToScoring([createPhotographJoker()], scored);
    expect(result.xMult).toBe(PHOTOGRAPH_X_MULT);
  });
});
