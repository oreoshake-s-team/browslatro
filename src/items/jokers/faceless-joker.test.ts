// @vitest-environment node
import {
  FACELESS_JOKER_FACE_THRESHOLD,
  FACELESS_JOKER_PAYOUT,
  applyEndOfRoundJokers,
  applyHandLevelJokers,
  applyOnDiscardJokers,
  applyPerCardJokers,
  createBlueprintJoker,
  createBrainstormJoker,
  createFacelessJoker,
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

describe("Faceless Joker", () => {
  test("pays FACELESS_JOKER_PAYOUT when exactly the threshold of face cards is discarded", () => {
    const discarded = [card("J"), card("Q"), card("K")];
    const result = applyOnDiscardJokers([createFacelessJoker()], discarded);
    expect(result.moneyEarned).toBe(FACELESS_JOKER_PAYOUT);
  });

  test("emits a single step crediting Faceless Joker with the payout", () => {
    const discarded = [card("J"), card("Q"), card("K")];
    const result = applyOnDiscardJokers([createFacelessJoker()], discarded);
    expect(result.steps).toEqual([
      {
        jokerId: "faceless-joker",
        jokerName: "Faceless Joker",
        moneyEarned: FACELESS_JOKER_PAYOUT,
      },
    ]);
  });

  test("pays FACELESS_JOKER_PAYOUT when more than the threshold of face cards is discarded", () => {
    const discarded = [card("J"), card("Q"), card("K"), card("J")];
    const result = applyOnDiscardJokers([createFacelessJoker()], discarded);
    expect(result.moneyEarned).toBe(FACELESS_JOKER_PAYOUT);
  });

  test("pays nothing when one face below the threshold is discarded (negative)", () => {
    const discarded: Card[] = [];
    for (let i = 0; i < FACELESS_JOKER_FACE_THRESHOLD - 1; i += 1) {
      discarded.push(card("J"));
    }
    const result = applyOnDiscardJokers([createFacelessJoker()], discarded);
    expect(result.moneyEarned).toBe(0);
  });

  test("does not fire when one face below the threshold is discarded (negative)", () => {
    const discarded: Card[] = [];
    for (let i = 0; i < FACELESS_JOKER_FACE_THRESHOLD - 1; i += 1) {
      discarded.push(card("J"));
    }
    const result = applyOnDiscardJokers([createFacelessJoker()], discarded);
    expect(result.steps).toEqual([]);
  });

  test("counts only face cards (J, Q, K), ignoring non-face cards in the same discard", () => {
    const discarded = [card("J"), card("2"), card("Q"), card("5"), card("K")];
    const result = applyOnDiscardJokers([createFacelessJoker()], discarded);
    expect(result.moneyEarned).toBe(FACELESS_JOKER_PAYOUT);
  });

  test("pays nothing when no cards are discarded", () => {
    const result = applyOnDiscardJokers([createFacelessJoker()], []);
    expect(result.moneyEarned).toBe(0);
  });

  test("ignores discardsUsedThisRound from context", () => {
    const discarded = [card("J"), card("Q"), card("K")];
    const result = applyOnDiscardJokers([createFacelessJoker()], discarded, {
      discardsUsedThisRound: 99,
    });
    expect(result.moneyEarned).toBe(FACELESS_JOKER_PAYOUT);
  });

  test("does not contribute in the hand-level pass", () => {
    const result = applyHandLevelJokers([createFacelessJoker()]);
    expect(result.firedJokerIds).toEqual([]);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers([createFacelessJoker()], card("J"));
    expect(result.firedJokerIds).toEqual([]);
  });

  test("does not contribute in the end-of-round pass", () => {
    const result = applyEndOfRoundJokers([createFacelessJoker()]);
    expect(result.moneyEarned).toBe(0);
  });

  test("is a common joker", () => {
    expect(createFacelessJoker().rarity).toBe<JokerRarity>("common");
  });

  test("Blueprint copying Faceless Joker doubles the on-discard payout", () => {
    const discarded = [card("J"), card("Q"), card("K")];
    const result = applyOnDiscardJokers(
      [createBlueprintJoker(), createFacelessJoker()],
      discarded,
    );
    expect(result.moneyEarned).toBe(FACELESS_JOKER_PAYOUT * 2);
  });

  test("Brainstorm copying Faceless Joker doubles the on-discard payout", () => {
    const discarded = [card("J"), card("Q"), card("K")];
    const result = applyOnDiscardJokers(
      [createFacelessJoker(), createBrainstormJoker()],
      discarded,
    );
    expect(result.moneyEarned).toBe(FACELESS_JOKER_PAYOUT * 2);
  });

  test("Blueprint with no right neighbor contributes nothing extra (negative)", () => {
    const discarded = [card("J"), card("Q"), card("K")];
    const result = applyOnDiscardJokers(
      [createFacelessJoker(), createBlueprintJoker()],
      discarded,
    );
    expect(result.moneyEarned).toBe(FACELESS_JOKER_PAYOUT);
  });
});
