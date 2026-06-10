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
  extraTriggersPerCard = 0,
): number[] {
  const ids: number[] = [];
  for (const card of getHeldInHand(hand, submittedIds)) {
    if (card.enhancement !== enhancement) continue;
    const copies = 1 + (card.seal === "red" ? 1 : 0) + extraTriggersPerCard;
    for (let i = 0; i < copies; i += 1) ids.push(card.id);
  }
  return ids;
}

export const STEEL_MULT_FACTOR = 1.5;

export function steelHeldMultiplier(
  hand: ReadonlyArray<Card>,
  submittedIds: ReadonlySet<number>,
  extraTriggersPerCard = 0,
): number {
  const count = heldEnhancementIdsWithRedSeal(
    hand,
    submittedIds,
    "steel",
    extraTriggersPerCard,
  ).length;
  return STEEL_MULT_FACTOR ** count;
}
