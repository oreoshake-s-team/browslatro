import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "./game";
import { createTarotCatalog } from "../items/tarots";
import type { Consumable } from "../items/consumables";

function hermitConsumable(): Consumable {
  const tarot = createTarotCatalog().find((t) => t.id === "the-hermit");
  if (!tarot) throw new Error("The Hermit missing from catalog");
  return { kind: "tarot", card: tarot };
}

describe("lastUsedConsumable store slice", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("starts as null on a fresh store", () => {
    expect(useGame.getState().lastUsedConsumable).toBeNull();
  });

  test("setLastUsedConsumable replaces the stored value", () => {
    const tarot = hermitConsumable();
    useGame.getState().setLastUsedConsumable(tarot);
    expect(useGame.getState().lastUsedConsumable).toEqual(tarot);
  });

  test("resetLastUsedConsumable returns the value to null", () => {
    useGame.getState().setLastUsedConsumable(hermitConsumable());
    useGame.getState().resetLastUsedConsumable();
    expect(useGame.getState().lastUsedConsumable).toBeNull();
  });

  test("resetGame clears the tracked consumable", () => {
    useGame.getState().setLastUsedConsumable(hermitConsumable());
    useGame.getState().resetGame();
    expect(useGame.getState().lastUsedConsumable).toBeNull();
  });
});
