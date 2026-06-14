// @vitest-environment node
import {
  BLACKBOARD_X_MULT,
  applyHandLevelJokers,
  applyPerCardJokers,
  createBlackboardJoker,
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

describe("Blackboard", () => {
  test("multiplies xMult by BLACKBOARD_X_MULT when every held card is a Spade or Club", () => {
    const result = applyHandLevelJokers([createBlackboardJoker()], {
      heldInHandCards: [card("K", "spades"), card("3", "clubs")],
    });
    expect(result.heldXMult).toBe(BLACKBOARD_X_MULT);
  });

  test("fires when every held card is a Spade or Club", () => {
    const result = applyHandLevelJokers([createBlackboardJoker()], {
      heldInHandCards: [card("K", "spades")],
    });
    expect(result.firedJokerIds).toEqual(["blackboard"]);
  });

  test("does not multiply when a held card is a Heart", () => {
    const result = applyHandLevelJokers([createBlackboardJoker()], {
      heldInHandCards: [card("K", "spades"), card("3", "hearts")],
    });
    expect(result.heldXMult).toBe(1);
  });

  test("does not multiply when a held card is a Diamond", () => {
    const result = applyHandLevelJokers([createBlackboardJoker()], {
      heldInHandCards: [card("3", "clubs"), card("Q", "diamonds")],
    });
    expect(result.heldXMult).toBe(1);
  });

  test("does not fire when a held card breaks the suit condition", () => {
    const result = applyHandLevelJokers([createBlackboardJoker()], {
      heldInHandCards: [card("Q", "diamonds")],
    });
    expect(result.firedJokerIds).toEqual([]);
  });

  test("multiplies vacuously when no cards are held in hand", () => {
    const result = applyHandLevelJokers([createBlackboardJoker()], {
      heldInHandCards: [],
    });
    expect(result.heldXMult).toBe(BLACKBOARD_X_MULT);
  });

  test("multiplies vacuously when heldInHandCards is missing from context", () => {
    const result = applyHandLevelJokers([createBlackboardJoker()], {});
    expect(result.heldXMult).toBe(BLACKBOARD_X_MULT);
  });

  test("ignores the suits of played/scored cards", () => {
    const result = applyHandLevelJokers([createBlackboardJoker()], {
      scoredCards: [card("Q", "hearts"), card("Q", "diamonds")],
      heldInHandCards: [card("3", "clubs")],
    });
    expect(result.heldXMult).toBe(BLACKBOARD_X_MULT);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers([createBlackboardJoker()], card("K"));
    expect(result.firedJokerIds).toEqual([]);
  });

  test("is an uncommon joker", () => {
    expect(createBlackboardJoker().rarity).toBe<JokerRarity>("uncommon");
  });
});
