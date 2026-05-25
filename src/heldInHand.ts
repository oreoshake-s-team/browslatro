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

export const STEEL_MULT_FACTOR = 1.5;

export function steelHeldMultiplier(
  hand: ReadonlyArray<Card>,
  submittedIds: ReadonlySet<number>,
): number {
  const count = countHeldEnhancement(hand, submittedIds, "steel");
  return STEEL_MULT_FACTOR ** count;
}
