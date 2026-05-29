import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "./game";

describe("deck store", () => {
  beforeEach(() => {
    useGame.getState().resetDeck();
  });

  test("starts with an empty hand", () => {
    expect(useGame.getState().dealt.hand).toHaveLength(0);
  });

  test("starts with no destroyed card keys", () => {
    expect(useGame.getState().destroyedCardKeys.size).toBe(0);
  });

  test("setDestroyedCardKeys accepts an updater function", () => {
    useGame.getState().setDestroyedCardKeys((prev) => {
      const next = new Set(prev);
      next.add("AS");
      return next;
    });
    expect(useGame.getState().destroyedCardKeys.has("AS")).toBe(true);
  });

  test("setCardEnhancementsByKey accepts an updater function", () => {
    useGame.getState().setCardEnhancementsByKey((prev) => {
      const next = new Map(prev);
      next.set("AS", "gold");
      return next;
    });
    expect(useGame.getState().cardEnhancementsByKey.get("AS")).toBe("gold");
  });

  test("resetDeck clears added cards", () => {
    useGame.getState().setAddedCards((prev) => [...prev]);
    useGame.getState().setDestroyedCardKeys(new Set(["AS"]));
    useGame.getState().resetDeck();
    expect(useGame.getState().destroyedCardKeys.size).toBe(0);
  });
});
