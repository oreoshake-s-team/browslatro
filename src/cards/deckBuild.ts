import { deal, shuffle, HAND_SIZE, type DealResult } from "./deck";
import type { Card, Enhancement, Seal } from "./types";

export function applyEnhancementOverrides(
  cards: ReadonlyArray<Card>,
  overrides: ReadonlyMap<number, Enhancement | null>,
): Card[] {
  return cards.map((c) => {
    const override = overrides.get(c.id);
    if (override === null) {
      if (c.enhancement === undefined) return c;
      const { enhancement: removed, ...rest } = c;
      return rest;
    }
    if (c.enhancement !== undefined) return c;
    return override === undefined ? c : { ...c, enhancement: override };
  });
}

export function applySealOverrides(
  cards: ReadonlyArray<Card>,
  overrides: ReadonlyMap<number, Seal>,
): Card[] {
  return cards.map((c) => {
    if (c.seal !== undefined && c.seal !== null) return c;
    const override = overrides.get(c.id);
    return override === undefined ? c : { ...c, seal: override };
  });
}

export function buildShuffledDeck(
  baseDeckCards: ReadonlyArray<Card> = [],
  destroyedCardIds: ReadonlySet<number> = new Set(),
  addedCards: ReadonlyArray<Card> = [],
  enhancementOverrides: ReadonlyMap<number, Enhancement | null> = new Map(),
  sealOverrides: ReadonlyMap<number, Seal> = new Map(),
): Card[] {
  const survivingBase = baseDeckCards.filter((c) => !destroyedCardIds.has(c.id));
  const base = applySealOverrides(
    applyEnhancementOverrides(survivingBase, enhancementOverrides),
    sealOverrides,
  );
  const extras = applySealOverrides(
    applyEnhancementOverrides(addedCards, enhancementOverrides),
    sealOverrides,
  );
  return shuffle([...base, ...extras]);
}

export function initialDeal(
  baseDeckCards: ReadonlyArray<Card> = [],
  destroyedCardIds: ReadonlySet<number> = new Set(),
  handSize: number = HAND_SIZE,
  addedCards: ReadonlyArray<Card> = [],
  enhancementOverrides: ReadonlyMap<number, Enhancement | null> = new Map(),
  sealOverrides: ReadonlyMap<number, Seal> = new Map(),
): DealResult {
  return deal(
    buildShuffledDeck(
      baseDeckCards,
      destroyedCardIds,
      addedCards,
      enhancementOverrides,
      sealOverrides,
    ),
    Math.max(1, handSize),
  );
}

export function countEnhancedInFullDeck(
  baseDeckCards: ReadonlyArray<Card> = [],
  destroyedCardIds: ReadonlySet<number> = new Set(),
  addedCards: ReadonlyArray<Card> = [],
  enhancementOverrides: ReadonlyMap<number, Enhancement | null> = new Map(),
): number {
  const survivingBase = baseDeckCards.filter(
    (c) => !destroyedCardIds.has(c.id),
  );
  const base = applyEnhancementOverrides(survivingBase, enhancementOverrides);
  const extras = applyEnhancementOverrides(addedCards, enhancementOverrides);
  let count = 0;
  for (const c of base) if (c.enhancement !== undefined) count += 1;
  for (const c of extras) if (c.enhancement !== undefined) count += 1;
  return count;
}

export function fullDeckSize(
  baseDeckCards: ReadonlyArray<Card> = [],
  destroyedCardIds: ReadonlySet<number> = new Set(),
  addedCards: ReadonlyArray<Card> = [],
): number {
  const survivingBase = baseDeckCards.filter(
    (c) => !destroyedCardIds.has(c.id),
  );
  return survivingBase.length + addedCards.length;
}

export function countMissingFromFullDeck(
  baseDeckCards: ReadonlyArray<Card> = [],
  destroyedCardIds: ReadonlySet<number> = new Set(),
  addedCards: ReadonlyArray<Card> = [],
): number {
  return Math.max(
    0,
    baseDeckCards.length -
      fullDeckSize(baseDeckCards, destroyedCardIds, addedCards),
  );
}

export function countEnhancementInFullDeck(
  baseDeckCards: ReadonlyArray<Card> = [],
  destroyedCardIds: ReadonlySet<number> = new Set(),
  addedCards: ReadonlyArray<Card> = [],
  enhancementOverrides: ReadonlyMap<number, Enhancement | null> = new Map(),
  enhancement: Enhancement | null = null,
): number {
  if (enhancement === null) return 0;
  const survivingBase = baseDeckCards.filter(
    (c) => !destroyedCardIds.has(c.id),
  );
  const base = applyEnhancementOverrides(survivingBase, enhancementOverrides);
  const extras = applyEnhancementOverrides(addedCards, enhancementOverrides);
  let count = 0;
  for (const c of base) if (c.enhancement === enhancement) count += 1;
  for (const c of extras) if (c.enhancement === enhancement) count += 1;
  return count;
}

export function fullDeckPile(
  baseDeckCards: ReadonlyArray<Card> = [],
  destroyedCardIds: ReadonlySet<number> = new Set(),
  addedCards: ReadonlyArray<Card> = [],
  enhancementOverrides: ReadonlyMap<number, Enhancement | null> = new Map(),
  sealOverrides: ReadonlyMap<number, Seal> = new Map(),
): DealResult {
  return {
    hand: [],
    remaining: buildShuffledDeck(
      baseDeckCards,
      destroyedCardIds,
      addedCards,
      enhancementOverrides,
      sealOverrides,
    ),
  };
}
