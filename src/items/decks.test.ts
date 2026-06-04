// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  DEFAULT_DECK,
  createDeckCatalog,
  deckStartingDiscardsDelta,
  deckStartingHandsDelta,
  deckStartingMoneyDelta,
  getDeckSpec,
  type Deck,
} from "./decks";

describe("DEFAULT_DECK", () => {
  test("defaults to Red Deck (Balatro default)", () => {
    expect(DEFAULT_DECK).toBe("red-deck");
  });
});

describe("createDeckCatalog", () => {
  test("includes all 15 standard Balatro decks", () => {
    expect(createDeckCatalog()).toHaveLength(15);
  });

  test("every spec carries a non-empty name", () => {
    const names = createDeckCatalog().map((d) => d.name);
    expect(names.every((n) => n.length > 0)).toBe(true);
  });

  test("every spec carries a non-empty description", () => {
    const descs = createDeckCatalog().map((d) => d.description);
    expect(descs.every((d) => d.length > 0)).toBe(true);
  });
});

describe("getDeckSpec", () => {
  test("returns the matching spec for Red Deck", () => {
    expect(getDeckSpec("red-deck").name).toBe("Red Deck");
  });

  test("throws for an unknown deck id", () => {
    expect(() => getDeckSpec("invalid" as unknown as Deck)).toThrow(
      "unknown deck: invalid",
    );
  });
});

describe("DeckSpec.implemented", () => {
  test("Red, Yellow, and Blue Decks are implemented", () => {
    const implemented = createDeckCatalog()
      .filter((d) => d.implemented)
      .map((d) => d.id);
    expect(implemented).toEqual(["red-deck", "yellow-deck", "blue-deck"]);
  });

  test("other decks are not yet implemented (negative)", () => {
    const unimplementedCount = createDeckCatalog().filter(
      (d) => !d.implemented,
    ).length;
    expect(unimplementedCount).toBe(12);
  });
});

describe("deckStartingMoneyDelta", () => {
  test("Yellow Deck adds $10", () => {
    expect(deckStartingMoneyDelta("yellow-deck")).toBe(10);
  });

  test("Red Deck does not add starting money (negative)", () => {
    expect(deckStartingMoneyDelta("red-deck")).toBe(0);
  });
});

describe("deckStartingDiscardsDelta", () => {
  test("Red Deck adds 1 discard", () => {
    expect(deckStartingDiscardsDelta("red-deck")).toBe(1);
  });

  test("Yellow Deck does not change starting discards (negative)", () => {
    expect(deckStartingDiscardsDelta("yellow-deck")).toBe(0);
  });
});

describe("deckStartingHandsDelta", () => {
  test("Blue Deck adds 1 hand", () => {
    expect(deckStartingHandsDelta("blue-deck")).toBe(1);
  });

  test("Red Deck does not change starting hands (negative)", () => {
    expect(deckStartingHandsDelta("red-deck")).toBe(0);
  });
});
