import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "./game";

describe("deck store", () => {
  beforeEach(() => {
    useGame.getState().resetDeck();
  });

  test("starts with an empty hand", () => {
    expect(useGame.getState().dealt.hand).toHaveLength(0);
  });

  test("starts with no destroyed card ids", () => {
    expect(useGame.getState().destroyedCardIds.size).toBe(0);
  });

  test("setDestroyedCardIds accepts an updater function", () => {
    useGame.getState().setDestroyedCardIds((prev) => {
      const next = new Set(prev);
      next.add(42);
      return next;
    });
    expect(useGame.getState().destroyedCardIds.has(42)).toBe(true);
  });

  test("setCardEnhancementsById accepts an updater function", () => {
    useGame.getState().setCardEnhancementsById((prev) => {
      const next = new Map(prev);
      next.set(42, "gold");
      return next;
    });
    expect(useGame.getState().cardEnhancementsById.get(42)).toBe("gold");
  });

  test("setBaseDeckCards replaces the base deck", () => {
    useGame.getState().setBaseDeckCards([
      { id: 1, rank: "A", suit: "spades" },
    ]);
    expect(useGame.getState().baseDeckCards).toHaveLength(1);
  });

  test("resetDeck clears destroyed ids", () => {
    useGame.getState().setAddedCards((prev) => [...prev]);
    useGame.getState().setDestroyedCardIds(new Set([1]));
    useGame.getState().resetDeck();
    expect(useGame.getState().destroyedCardIds.size).toBe(0);
  });

  test("setBaseDeckCards replacement is reset by a subsequent setBaseDeckCards", () => {
    useGame.getState().setBaseDeckCards([
      { id: 1, rank: "A", suit: "spades" },
    ]);
    useGame.getState().setBaseDeckCards([]);
    expect(useGame.getState().baseDeckCards).toHaveLength(0);
  });
});
