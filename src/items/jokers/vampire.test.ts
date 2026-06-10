// @vitest-environment node
import {
  VAMPIRE_X_MULT_PER_ENHANCED,
  applyEnhancementsEatenToJokerStates,
  applyHandLevelJokers,
  applyScoredCardMutations,
  applyScoredMutationsToCards,
  createJokerCatalog,
  createMidasMaskJoker,
  createVampireJoker,
} from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades", enhancement?: Card["enhancement"]): Card {
  return enhancement === undefined
    ? { id: ++nextId, rank, suit }
    : { id: ++nextId, rank, suit, enhancement };
}

beforeEach(() => {
  nextId = 0;
});

describe("Vampire (#969)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("vampire");
  });

  test("eats a scored enhanced card", () => {
    const steel = card("5", "clubs", "steel");
    const result = applyScoredCardMutations([createVampireJoker()], [steel]);
    expect(result.enhancementChanges.get(steel.id)).toBeNull();
  });

  test("counts each eaten enhancement", () => {
    const cards = [card("5", "clubs", "steel"), card("6", "clubs", "lucky")];
    const result = applyScoredCardMutations([createVampireJoker()], cards);
    expect(result.enhancementsEaten).toBe(2);
  });

  test("ignores unenhanced cards (negative)", () => {
    const plain = card("5");
    const result = applyScoredCardMutations([createVampireJoker()], [plain]);
    expect(result.enhancementsEaten).toBe(0);
  });

  test("the stripped replacement loses the enhancement before scoring", () => {
    const steel = card("5", "clubs", "steel");
    const result = applyScoredCardMutations([createVampireJoker()], [steel]);
    const [replaced] = applyScoredMutationsToCards(
      [steel],
      result.enhancementChanges,
    );
    expect(replaced.enhancement).toBeUndefined();
  });

  test("eaten enhancements grow the counter and the X Mult", () => {
    const jokers = applyEnhancementsEatenToJokerStates(
      [createVampireJoker()],
      3,
    );
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "Pair" });
    expect(result.xMult).toBe(1 + 3 * VAMPIRE_X_MULT_PER_ENHANCED);
  });

  test("a Vampire right of Midas Mask eats the fresh gold", () => {
    const king = card("K");
    const result = applyScoredCardMutations(
      [createMidasMaskJoker(), createVampireJoker()],
      [king],
    );
    expect(result.enhancementChanges.get(king.id)).toBeNull();
    expect(result.enhancementsEaten).toBe(1);
  });

  test("a Vampire left of Midas Mask leaves the gold (negative)", () => {
    const king = card("K");
    const result = applyScoredCardMutations(
      [createVampireJoker(), createMidasMaskJoker()],
      [king],
    );
    expect(result.enhancementChanges.get(king.id)).toBe("gold");
    expect(result.enhancementsEaten).toBe(0);
  });

  test("contributes nothing before eating (negative)", () => {
    const result = applyHandLevelJokers([createVampireJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.xMult).toBe(1);
  });
});
