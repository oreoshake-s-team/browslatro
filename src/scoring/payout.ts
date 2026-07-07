import type { Card } from "../cards/types";
import { countHeldEnhancement } from "../cards/heldInHand.js";

export const INTEREST_RATE_PER = 5;
export const INTEREST_CAP = 5;
export const GOLD_HELD_BONUS_PER_CARD = 3;
export const REMAINING_HAND_BONUS = 1;

export function roundBlindReward(input: {
  readonly blind: number;
  readonly smallBlindSkipped: boolean;
  readonly savedByMrBones: boolean;
}): number {
  if (input.savedByMrBones || input.smallBlindSkipped) return 0;
  return input.blind + 2;
}

export function calculateInterest(
  wallet: number,
  cap: number = INTEREST_CAP,
): number {
  if (wallet <= 0) return 0;
  const raw = Math.floor(wallet / INTEREST_RATE_PER);
  return Math.min(raw, cap);
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
