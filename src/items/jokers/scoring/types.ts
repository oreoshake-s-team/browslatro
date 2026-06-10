import type { Card, Rank, Suit } from "../../../cards/types";
import type { HandLabel } from "../../../scoring/handEvaluator";
import type { HandPlayCounts } from "../../../components/hud/handPlayCounts";
import type { RandomSource } from "../types";

export interface JokerScoringResult {
  readonly additiveMult: number;
  readonly additiveChips: number;
  readonly xMult: number;
  readonly moneyEarned: number;
}

export interface JokerHandLevelStep {
  readonly jokerId: string;
  readonly jokerName: string;
  readonly additiveMult?: number;
  readonly additiveChips?: number;
  readonly xMultFactor?: number;
  readonly moneyEarned?: number;
}

export interface JokerHandResult {
  readonly additiveMult: number;
  readonly additiveChips: number;
  readonly xMult: number;
  readonly moneyEarned: number;
  readonly firedJokerIds: ReadonlyArray<string>;
  readonly steps: ReadonlyArray<JokerHandLevelStep>;
}

export interface JokerCardStep {
  readonly jokerId: string;
  readonly jokerName: string;
  readonly additiveMult?: number;
  readonly additiveChips?: number;
  readonly xMultFactor?: number;
  readonly moneyEarned?: number;
}

export interface JokerCardResult {
  readonly moneyEarned: number;
  readonly additiveMult: number;
  readonly additiveChips: number;
  readonly xMult: number;
  readonly firedJokerIds: ReadonlyArray<string>;
  readonly steps: ReadonlyArray<JokerCardStep>;
}

export interface PerCardContext {
  readonly firstFaceAlreadyScored?: boolean;
  readonly smearedSuits?: boolean;
  readonly idolTarget?: { readonly rank: Rank; readonly suit: Suit } | null;
  readonly ancientSuit?: Suit | null;
}

export interface HandLevelContext {
  readonly playedHandLabel?: HandLabel;
  readonly playedCardCount?: number;
  readonly scoredCards?: ReadonlyArray<Card>;
  readonly heldInHandCards?: ReadonlyArray<Card>;
  readonly rng?: RandomSource;
  readonly remainingDiscards?: number;
  readonly remainingHands?: number;
  readonly money?: number;
  readonly fullDeck?: ReadonlyArray<Card>;
  readonly remainingDeck?: ReadonlyArray<Card>;
  readonly baseDeckSize?: number;
  readonly handPlayCounts?: HandPlayCounts;
  readonly handLabelsThisRound?: ReadonlyArray<HandLabel>;
  readonly blindsSkipped?: number;
  readonly addedCardsCount?: number;
}
