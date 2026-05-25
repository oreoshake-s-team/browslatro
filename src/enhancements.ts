import type { Card, Enhancement, Rank, Suit } from "./types";

export interface EnhancementEffect {
  readonly chipsDelta: number;
  readonly multDelta: number;
  readonly multTimes: number;
  readonly moneyDelta: number;
  readonly destroyChance: number;
}

export const NO_ENHANCEMENT_EFFECT: EnhancementEffect = {
  chipsDelta: 0,
  multDelta: 0,
  multTimes: 1,
  moneyDelta: 0,
  destroyChance: 0,
};

export const BONUS_ENHANCEMENT_CHIPS = 30;
export const MULT_ENHANCEMENT_MULT_DELTA = 4;

export type EnhancementRandomSource = () => number;

export interface EnhancementContext {
  readonly rng?: EnhancementRandomSource;
}

function assertNeverEnhancement(e: never): never {
  throw new Error(`Unhandled enhancement: ${JSON.stringify(e)}`);
}

export function applyCardEnhancement(
  card: Card,
  _context: EnhancementContext = {},
): EnhancementEffect {
  const enhancement = card.enhancement;
  if (!enhancement) return NO_ENHANCEMENT_EFFECT;
  switch (enhancement) {
    case "bonus":
      return { ...NO_ENHANCEMENT_EFFECT, chipsDelta: BONUS_ENHANCEMENT_CHIPS };
    case "mult":
      return { ...NO_ENHANCEMENT_EFFECT, multDelta: MULT_ENHANCEMENT_MULT_DELTA };
    case "wild":
    case "glass":
    case "steel":
    case "stone":
    case "gold":
    case "lucky":
      return NO_ENHANCEMENT_EFFECT;
    default:
      return assertNeverEnhancement(enhancement);
  }
}

export function cardSuitForEvaluation(card: Card): Suit | null {
  const enhancement = card.enhancement;
  if (!enhancement) return card.suit;
  switch (enhancement) {
    case "wild":
      return null;
    case "bonus":
    case "mult":
    case "glass":
    case "steel":
    case "gold":
    case "lucky":
    case "stone":
      return card.suit;
    default:
      return assertNeverEnhancement(enhancement);
  }
}

export function cardRankForEvaluation(card: Card): Rank | null {
  const enhancement = card.enhancement;
  if (!enhancement) return card.rank;
  switch (enhancement) {
    case "bonus":
    case "mult":
    case "wild":
    case "glass":
    case "steel":
    case "gold":
    case "lucky":
    case "stone":
      return card.rank;
    default:
      return assertNeverEnhancement(enhancement);
  }
}

export const ENHANCEMENT_KINDS: ReadonlyArray<Enhancement> = [
  "bonus",
  "mult",
  "wild",
  "glass",
  "steel",
  "stone",
  "gold",
  "lucky",
];
