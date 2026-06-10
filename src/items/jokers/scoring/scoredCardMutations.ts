import type { Card, Enhancement } from "../../../cards/types";
import type { Joker } from "../types";
import { isFaceCardWith } from "./utils";
import { isJokerActive } from "../stickers";

export interface ScoredCardMutationsResult {
  readonly enhancementChanges: ReadonlyMap<number, Enhancement | null>;
  readonly enhancementsEaten: number;
}

export function applyScoredCardMutations(
  allJokers: ReadonlyArray<Joker>,
  scoredCards: ReadonlyArray<Card>,
): ScoredCardMutationsResult {
  const jokers = allJokers.filter(isJokerActive);
  const current = new Map<number, Enhancement | null | undefined>();
  const unique: Card[] = [];
  for (const card of scoredCards) {
    if (current.has(card.id)) continue;
    current.set(card.id, card.enhancement);
    unique.push(card);
  }
  const enhancementChanges = new Map<number, Enhancement | null>();
  let enhancementsEaten = 0;
  for (const joker of jokers) {
    const effect = joker.effect;
    if (effect.kind === "played-faces-become-gold") {
      for (const card of unique) {
        if (!isFaceCardWith(card, jokers)) continue;
        if (current.get(card.id) != null) continue;
        current.set(card.id, "gold");
        enhancementChanges.set(card.id, "gold");
      }
    }
    if (effect.kind === "x-mult-per-enhancement-eaten") {
      for (const card of unique) {
        if (current.get(card.id) == null) continue;
        current.set(card.id, undefined);
        enhancementChanges.set(card.id, null);
        enhancementsEaten += 1;
      }
    }
  }
  return { enhancementChanges, enhancementsEaten };
}

export function applyScoredMutationsToCards(
  cards: ReadonlyArray<Card>,
  changes: ReadonlyMap<number, Enhancement | null>,
): Card[] {
  return cards.map((card) => {
    if (!changes.has(card.id)) return card;
    const change = changes.get(card.id);
    if (change === null || change === undefined) {
      if (card.enhancement == null) return card;
      const { enhancement: removed, ...rest } = card;
      return rest;
    }
    return { ...card, enhancement: change };
  });
}
