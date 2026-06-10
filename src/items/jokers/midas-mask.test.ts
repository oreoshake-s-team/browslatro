// @vitest-environment node
import {
  applyScoredCardMutations,
  applyScoredMutationsToCards,
  createJokerCatalog,
  createMidasMaskJoker,
  createPareidoliaJoker,
} from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Midas Mask (#969)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("midas-mask");
  });

  test("turns a scored King gold", () => {
    const king = card("K");
    const result = applyScoredCardMutations([createMidasMaskJoker()], [king]);
    expect(result.enhancementChanges.get(king.id)).toBe("gold");
  });

  test("leaves non-face cards unchanged (negative)", () => {
    const seven = card("7");
    const result = applyScoredCardMutations([createMidasMaskJoker()], [seven]);
    expect(result.enhancementChanges.has(seven.id)).toBe(false);
  });

  test("with Pareidolia every scored card turns gold", () => {
    const seven = card("7");
    const result = applyScoredCardMutations(
      [createMidasMaskJoker(), createPareidoliaJoker()],
      [seven],
    );
    expect(result.enhancementChanges.get(seven.id)).toBe("gold");
  });

  test("retrigger duplicates only convert once", () => {
    const king = card("K");
    const result = applyScoredCardMutations(
      [createMidasMaskJoker()],
      [king, king],
    );
    expect(result.enhancementChanges.size).toBe(1);
  });

  test("the replacement card carries the gold enhancement", () => {
    const king = card("K");
    const result = applyScoredCardMutations([createMidasMaskJoker()], [king]);
    const [replaced] = applyScoredMutationsToCards(
      [king],
      result.enhancementChanges,
    );
    expect(replaced.enhancement).toBe("gold");
  });
});
