// @vitest-environment node
import {
  DRIVERS_LICENSE_ENHANCED_THRESHOLD,
  DRIVERS_LICENSE_X_MULT,
  applyHandLevelJokers,
  applyPerCardJokers,
  createDriversLicenseJoker,
} from "../jokers";
import type { JokerRarity } from "../jokers";
import type { Card, Enhancement, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(
  rank: Rank,
  suit: Suit = "spades",
  enhancement?: Enhancement,
): Card {
  return { id: ++nextId, rank, suit, ...(enhancement ? { enhancement } : {}) };
}

function enhancedDeck(count: number): Card[] {
  const deck: Card[] = [];
  for (let i = 0; i < count; i += 1) deck.push(card("5", "spades", "bonus"));
  return deck;
}

beforeEach(() => {
  nextId = 0;
});

describe("Driver's License", () => {
  test("multiplies xMult by DRIVERS_LICENSE_X_MULT when enhanced count meets the threshold", () => {
    const deck = enhancedDeck(DRIVERS_LICENSE_ENHANCED_THRESHOLD);
    const result = applyHandLevelJokers([createDriversLicenseJoker()], {
      fullDeck: deck,
    });
    expect(result.xMult).toBe(DRIVERS_LICENSE_X_MULT);
  });

  test("reports Driver's License as fired when the threshold is met", () => {
    const deck = enhancedDeck(DRIVERS_LICENSE_ENHANCED_THRESHOLD);
    const result = applyHandLevelJokers([createDriversLicenseJoker()], {
      fullDeck: deck,
    });
    expect(result.firedJokerIds).toEqual(["drivers-license"]);
  });

  test("multiplies xMult even when enhanced count is well above the threshold", () => {
    const deck = enhancedDeck(DRIVERS_LICENSE_ENHANCED_THRESHOLD * 2);
    const result = applyHandLevelJokers([createDriversLicenseJoker()], {
      fullDeck: deck,
    });
    expect(result.xMult).toBe(DRIVERS_LICENSE_X_MULT);
  });

  test("does not multiply when one enhanced card below the threshold (negative)", () => {
    const deck = enhancedDeck(DRIVERS_LICENSE_ENHANCED_THRESHOLD - 1);
    const result = applyHandLevelJokers([createDriversLicenseJoker()], {
      fullDeck: deck,
    });
    expect(result.xMult).toBe(1);
  });

  test("does not fire when one enhanced card below the threshold (negative)", () => {
    const deck = enhancedDeck(DRIVERS_LICENSE_ENHANCED_THRESHOLD - 1);
    const result = applyHandLevelJokers([createDriversLicenseJoker()], {
      fullDeck: deck,
    });
    expect(result.firedJokerIds).toEqual([]);
  });

  test("counts cards across all enhancement kinds, not just one", () => {
    const mixed: Card[] = [];
    const kinds: Enhancement[] = [
      "bonus",
      "mult",
      "wild",
      "glass",
      "steel",
      "stone",
      "gold",
      "lucky",
    ];
    for (let i = 0; i < DRIVERS_LICENSE_ENHANCED_THRESHOLD; i += 1) {
      mixed.push(card("5", "spades", kinds[i % kinds.length]));
    }
    const result = applyHandLevelJokers([createDriversLicenseJoker()], {
      fullDeck: mixed,
    });
    expect(result.xMult).toBe(DRIVERS_LICENSE_X_MULT);
  });

  test("ignores non-enhanced cards when counting", () => {
    const deck: Card[] = [
      ...enhancedDeck(DRIVERS_LICENSE_ENHANCED_THRESHOLD - 1),
      card("5", "spades"),
      card("5", "hearts"),
      card("5", "clubs"),
    ];
    const result = applyHandLevelJokers([createDriversLicenseJoker()], {
      fullDeck: deck,
    });
    expect(result.xMult).toBe(1);
  });

  test("does not multiply when fullDeck is missing from context", () => {
    const result = applyHandLevelJokers([createDriversLicenseJoker()], {});
    expect(result.xMult).toBe(1);
  });

  test("does not contribute in the per-card pass", () => {
    const result = applyPerCardJokers(
      [createDriversLicenseJoker()],
      card("5", "spades", "bonus"),
    );
    expect(result.firedJokerIds).toEqual([]);
  });

  test("is a rare joker", () => {
    expect(createDriversLicenseJoker().rarity).toBe<JokerRarity>("rare");
  });
});
