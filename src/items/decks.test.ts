// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  createDeckCatalog,
  deckCompositionTransforms,
  deckJokerSlotsDelta,
  deckStartingDiscardsDelta,
  deckStartingHandsDelta,
  deckStartingMoneyDelta,
  getDeckSpec,
  type Deck,
} from "./decks";
import { applyDeckCompositionTransforms, createDeck } from "../cards/deck";

describe("createDeckCatalog", () => {
  test("includes all 15 standard Balatro decks", () => {
    expect(createDeckCatalog()).toHaveLength(15);
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
  test("Red, Yellow, Blue, Black, and Abandoned Decks are implemented", () => {
    const implemented = createDeckCatalog()
      .filter((d) => d.implemented)
      .map((d) => d.id);
    expect(implemented).toEqual([
      "red-deck",
      "yellow-deck",
      "blue-deck",
      "black-deck",
      "abandoned-deck",
    ]);
  });

  test("other decks are not yet implemented (negative)", () => {
    const unimplementedCount = createDeckCatalog().filter(
      (d) => !d.implemented,
    ).length;
    expect(unimplementedCount).toBe(10);
  });
});

describe("Black Deck spec", () => {
  test("declares the +1 joker slot and -1 hand modifiers", () => {
    expect(getDeckSpec("black-deck").modifiers).toEqual([
      { kind: "joker-slots-delta", amount: 1 },
      { kind: "starting-hands-delta", amount: -1 },
    ]);
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

  test("Black Deck subtracts 1 hand", () => {
    expect(deckStartingHandsDelta("black-deck")).toBe(-1);
  });

  test("Red Deck does not change starting hands (negative)", () => {
    expect(deckStartingHandsDelta("red-deck")).toBe(0);
  });
});

describe("Abandoned Deck spec (#570)", () => {
  test("declares a drop-face-cards deck-composition modifier", () => {
    expect(getDeckSpec("abandoned-deck").modifiers).toEqual([
      { kind: "deck-composition", transform: "drop-face-cards" },
    ]);
  });

  test("is marked as implemented", () => {
    expect(getDeckSpec("abandoned-deck").implemented).toBe(true);
  });
});

describe("deckCompositionTransforms (#570)", () => {
  test("Abandoned Deck returns the drop-face-cards transform", () => {
    expect(deckCompositionTransforms("abandoned-deck")).toEqual([
      "drop-face-cards",
    ]);
  });

  test("Red Deck returns no composition transforms (negative)", () => {
    expect(deckCompositionTransforms("red-deck")).toEqual([]);
  });

  test("Black Deck returns no composition transforms (negative)", () => {
    expect(deckCompositionTransforms("black-deck")).toEqual([]);
  });
});

describe("Abandoned Deck initial deck materialization (#570)", () => {
  test("the deck startNewGame would produce is 40 cards", () => {
    const built = applyDeckCompositionTransforms(
      createDeck(),
      deckCompositionTransforms("abandoned-deck"),
    );
    expect(built).toHaveLength(40);
  });

  test("the deck startNewGame would produce contains no J/Q/K", () => {
    const built = applyDeckCompositionTransforms(
      createDeck(),
      deckCompositionTransforms("abandoned-deck"),
    );
    expect(built.some((c) => ["J", "Q", "K"].includes(c.rank))).toBe(false);
  });

  test("Red Deck's initial deck is still 52 cards with face cards intact (negative)", () => {
    const built = applyDeckCompositionTransforms(
      createDeck(),
      deckCompositionTransforms("red-deck"),
    );
    expect(built).toHaveLength(52);
  });

  test("Red Deck's initial deck still contains 4 Jacks (negative)", () => {
    const built = applyDeckCompositionTransforms(
      createDeck(),
      deckCompositionTransforms("red-deck"),
    );
    expect(built.filter((c) => c.rank === "J")).toHaveLength(4);
  });
});

describe("deckJokerSlotsDelta", () => {
  test("Black Deck adds 1 joker slot", () => {
    expect(deckJokerSlotsDelta("black-deck")).toBe(1);
  });

  test("Red Deck does not change joker slots (negative)", () => {
    expect(deckJokerSlotsDelta("red-deck")).toBe(0);
  });

  test("Blue Deck does not change joker slots (negative)", () => {
    expect(deckJokerSlotsDelta("blue-deck")).toBe(0);
  });
});
