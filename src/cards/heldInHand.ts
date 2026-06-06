import type { Card, Enhancement } from "./types";

export function getHeldInHand(
  hand: ReadonlyArray<Card>,
  submittedIds: ReadonlySet<number>,
): ReadonlyArray<Card> {
  return hand.filter((c) => !submittedIds.has(c.id));
}

export function countHeldEnhancement(
  hand: ReadonlyArray<Card>,
  submittedIds: ReadonlySet<number>,
  enhancement: Enhancement,
): number {
  return getHeldInHand(hand, submittedIds).filter(
    (c) => c.enhancement === enhancement,
  ).length;
}

export function heldEnhancementIdsWithRedSeal(
  hand: ReadonlyArray<Card>,
  submittedIds: ReadonlySet<number>,
  enhancement: Enhancement,
): number[] {
  const ids: number[] = [];
  for (const card of getHeldInHand(hand, submittedIds)) {
    if (card.enhancement !== enhancement) continue;
    ids.push(card.id);
    if (card.seal === "red") ids.push(card.id);
  }
  return ids;
}

export const STEEL_MULT_FACTOR = 1.5;

export function steelHeldMultiplier(
  hand: ReadonlyArray<Card>,
  submittedIds: ReadonlySet<number>,
): number {
  const count = heldEnhancementIdsWithRedSeal(
    hand,
    submittedIds,
    "steel",
  ).length;
  return STEEL_MULT_FACTOR ** count;
}
