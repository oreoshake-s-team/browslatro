import { beforeEach, describe, expect, test } from "vitest";
import { useDeck } from "./deck";

describe("deck store", () => {
  beforeEach(() => {
    useDeck.getState().resetDeck();
  });

  test("starts with an empty hand", () => {
    expect(useDeck.getState().dealt.hand).toHaveLength(0);
  });

  test("starts with no destroyed card keys", () => {
    expect(useDeck.getState().destroyedCardKeys.size).toBe(0);
  });

  test("setDestroyedCardKeys accepts an updater function", () => {
    useDeck.getState().setDestroyedCardKeys((prev) => {
      const next = new Set(prev);
      next.add("AS");
      return next;
    });
    expect(useDeck.getState().destroyedCardKeys.has("AS")).toBe(true);
  });

  test("setCardEnhancementsByKey accepts an updater function", () => {
    useDeck.getState().setCardEnhancementsByKey((prev) => {
      const next = new Map(prev);
      next.set("AS", "gold");
      return next;
    });
    expect(useDeck.getState().cardEnhancementsByKey.get("AS")).toBe("gold");
  });

  test("resetDeck clears added cards", () => {
    useDeck.getState().setAddedCards((prev) => [...prev]);
    useDeck.getState().setDestroyedCardKeys(new Set(["AS"]));
    useDeck.getState().resetDeck();
    expect(useDeck.getState().destroyedCardKeys.size).toBe(0);
  });
});
