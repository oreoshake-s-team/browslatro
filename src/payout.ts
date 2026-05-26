import type { Card } from "./types";
import { countHeldEnhancement } from "./heldInHand";

export const INTEREST_RATE_PER = 5;
export const INTEREST_CAP = 5;
export const GOLD_HELD_BONUS_PER_CARD = 3;
export const REMAINING_HAND_BONUS = 1;

export function calculateInterest(wallet: number): number {
  if (wallet <= 0) return 0;
  const raw = Math.floor(wallet / INTEREST_RATE_PER);
  return Math.min(raw, INTEREST_CAP);
}

export function countGoldHeldInHand(
  hand: ReadonlyArray<Card>,
  submittedIds: ReadonlySet<number>,
): number {
  return countHeldEnhancement(hand, submittedIds, "gold");
}

export function goldHeldBonus(
  hand: ReadonlyArray<Card>,
  submittedIds: ReadonlySet<number>,
): number {
  return countGoldHeldInHand(hand, submittedIds) * GOLD_HELD_BONUS_PER_CARD;
}
