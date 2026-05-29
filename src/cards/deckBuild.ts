import {
  cardKey,
  createDeck,
  deal,
  shuffle,
  HAND_SIZE,
  type DealResult,
} from "./deck";
import type { Card, Enhancement, Seal } from "./types";

export function applyEnhancementOverrides(
  cards: ReadonlyArray<Card>,
  overrides: ReadonlyMap<string, Enhancement>,
): Card[] {
  return cards.map((c) => {
    if (c.enhancement !== undefined) return c;
    const override = overrides.get(cardKey(c));
    return override === undefined ? c : { ...c, enhancement: override };
  });
}

export function applySealOverrides(
  cards: ReadonlyArray<Card>,
  overrides: ReadonlyMap<string, Seal>,
): Card[] {
  return cards.map((c) => {
    if (c.seal !== undefined && c.seal !== null) return c;
    const override = overrides.get(cardKey(c));
    return override === undefined ? c : { ...c, seal: override };
  });
}

export function buildShuffledDeck(
  excludedKeys: ReadonlySet<string> = new Set(),
  addedCards: ReadonlyArray<Card> = [],
  enhancementOverrides: ReadonlyMap<string, Enhancement> = new Map(),
  sealOverrides: ReadonlyMap<string, Seal> = new Map(),
): Card[] {
  const base = applySealOverrides(
    applyEnhancementOverrides(createDeck(excludedKeys), enhancementOverrides),
    sealOverrides,
  );
  const extras = applySealOverrides(
    applyEnhancementOverrides(addedCards, enhancementOverrides),
    sealOverrides,
  );
  return shuffle([...base, ...extras]);
}

export function initialDeal(
  excludedKeys: ReadonlySet<string> = new Set(),
  handSize: number = HAND_SIZE,
  addedCards: ReadonlyArray<Card> = [],
  enhancementOverrides: ReadonlyMap<string, Enhancement> = new Map(),
  sealOverrides: ReadonlyMap<string, Seal> = new Map(),
): DealResult {
  return deal(
    buildShuffledDeck(excludedKeys, addedCards, enhancementOverrides, sealOverrides),
    Math.max(1, handSize),
  );
}

export function fullDeckPile(
  excludedKeys: ReadonlySet<string> = new Set(),
  addedCards: ReadonlyArray<Card> = [],
  enhancementOverrides: ReadonlyMap<string, Enhancement> = new Map(),
  sealOverrides: ReadonlyMap<string, Seal> = new Map(),
): DealResult {
  return {
    hand: [],
    remaining: buildShuffledDeck(
      excludedKeys,
      addedCards,
      enhancementOverrides,
      sealOverrides,
    ),
  };
}
