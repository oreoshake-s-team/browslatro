import { rollChance } from "../dev/chanceOverride";
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
export const GLASS_ENHANCEMENT_MULT_TIMES = 2;
export const GLASS_ENHANCEMENT_DESTROY_CHANCE = 0.25;
export const STONE_ENHANCEMENT_CHIPS = 50;
export const LUCKY_ENHANCEMENT_MULT_CHANCE = 0.2;
export const LUCKY_ENHANCEMENT_MULT_AMOUNT = 20;
export const LUCKY_ENHANCEMENT_MONEY_CHANCE = 1 / 15;
export const LUCKY_ENHANCEMENT_MONEY_AMOUNT = 20;

export type EnhancementRandomSource = () => number;

export interface EnhancementContext {
  readonly rng?: EnhancementRandomSource;
}

export const enhancementRngConfig: { rng: EnhancementRandomSource } = {
  rng: Math.random,
};

export function rollEnhancementChance(chance: number): boolean {
  return rollChance(chance, enhancementRngConfig.rng);
}

function assertNeverEnhancement(e: never): never {
  throw new Error(`Unhandled enhancement: ${JSON.stringify(e)}`);
}

const BONUS_EFFECT: EnhancementEffect = {
  ...NO_ENHANCEMENT_EFFECT,
  chipsDelta: BONUS_ENHANCEMENT_CHIPS,
};
const MULT_EFFECT: EnhancementEffect = {
  ...NO_ENHANCEMENT_EFFECT,
  multDelta: MULT_ENHANCEMENT_MULT_DELTA,
};
const GLASS_EFFECT: EnhancementEffect = {
  ...NO_ENHANCEMENT_EFFECT,
  multTimes: GLASS_ENHANCEMENT_MULT_TIMES,
  destroyChance: GLASS_ENHANCEMENT_DESTROY_CHANCE,
};
const STONE_EFFECT: EnhancementEffect = {
  ...NO_ENHANCEMENT_EFFECT,
  chipsDelta: STONE_ENHANCEMENT_CHIPS,
};

export function applyCardEnhancement(
  card: Card,
  _context: EnhancementContext = {},
): EnhancementEffect {
  const enhancement = card.enhancement;
  if (!enhancement) return NO_ENHANCEMENT_EFFECT;
  switch (enhancement) {
    case "bonus":
      return BONUS_EFFECT;
    case "mult":
      return MULT_EFFECT;
    case "glass":
      return GLASS_EFFECT;
    case "stone":
      return STONE_EFFECT;
    case "wild":
    case "steel":
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
    case "stone":
      return null;
    case "bonus":
    case "mult":
    case "glass":
    case "steel":
    case "gold":
    case "lucky":
      return card.suit;
    default:
      return assertNeverEnhancement(enhancement);
  }
}

export function cardRankForEvaluation(card: Card): Rank | null {
  const enhancement = card.enhancement;
  if (!enhancement) return card.rank;
  switch (enhancement) {
    case "stone":
      return null;
    case "bonus":
    case "mult":
    case "wild":
    case "glass":
    case "steel":
    case "gold":
    case "lucky":
      return card.rank;
    default:
      return assertNeverEnhancement(enhancement);
  }
}

export function isStoneCard(card: Card): boolean {
  return card.enhancement === "stone";
}

export interface LuckyRollResult {
  readonly multBonus: number;
  readonly moneyBonus: number;
}

export function applyLuckyRolls(card: Card): LuckyRollResult {
  if (card.enhancement !== "lucky") {
    return { multBonus: 0, moneyBonus: 0 };
  }
  const multHit = rollEnhancementChance(LUCKY_ENHANCEMENT_MULT_CHANCE);
  const moneyHit = rollEnhancementChance(LUCKY_ENHANCEMENT_MONEY_CHANCE);
  return {
    multBonus: multHit ? LUCKY_ENHANCEMENT_MULT_AMOUNT : 0,
    moneyBonus: moneyHit ? LUCKY_ENHANCEMENT_MONEY_AMOUNT : 0,
  };
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
