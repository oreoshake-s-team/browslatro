import type { Card, Enhancement, Suit } from "../../cards/types";
import { getRankChips } from "../../scoring/scoring";
import { getSealInfo, type SealInfo } from "../../cards/seals";
import { CARD_EDITION_INFO, type CardEditionInfo } from "../../cards/editions";
import {
  BONUS_ENHANCEMENT_CHIPS,
  GLASS_ENHANCEMENT_DESTROY_CHANCE,
  GLASS_ENHANCEMENT_MULT_TIMES,
  LUCKY_ENHANCEMENT_MONEY_AMOUNT,
  LUCKY_ENHANCEMENT_MONEY_CHANCE,
  LUCKY_ENHANCEMENT_MULT_AMOUNT,
  LUCKY_ENHANCEMENT_MULT_CHANCE,
  MULT_ENHANCEMENT_MULT_DELTA,
  STONE_ENHANCEMENT_CHIPS,
} from "../../cards/enhancements";
import { GOLD_HELD_BONUS_PER_CARD } from "../../scoring/payout";
import { STEEL_MULT_FACTOR } from "../../cards/heldInHand";
import { effectiveChance } from "../../dev/chanceOverride";

const SUIT_LABELS: Record<Suit, string> = {
  spades: "Spades",
  hearts: "Hearts",
  diamonds: "Diamonds",
  clubs: "Clubs",
};

const SUIT_GLYPHS: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

export interface EnhancementInfo {
  readonly name: string;
  readonly description: string;
}

export function formatChanceRatio(
  baseChance: number,
  probabilityMultiplier: number = 1,
): string {
  const eff = effectiveChance(baseChance, probabilityMultiplier);
  if (eff >= 1) return "guaranteed";
  const denominator = Math.round(1 / baseChance);
  const numerator = Math.min(
    denominator,
    Math.round(eff * denominator),
  );
  return numerator === 1
    ? `1-in-${denominator}`
    : `${numerator}-in-${denominator}`;
}

function buildEnhancementInfo(
  probabilityMultiplier: number,
): Record<Enhancement, EnhancementInfo> {
  return {
    bonus: { name: "Bonus", description: `+${BONUS_ENHANCEMENT_CHIPS} Chips when scored` },
    mult: { name: "Mult", description: `+${MULT_ENHANCEMENT_MULT_DELTA} Mult when scored` },
    wild: { name: "Wild", description: "Counts as every suit" },
    glass: {
      name: "Glass",
      description: `×${GLASS_ENHANCEMENT_MULT_TIMES} Mult when scored, ${formatChanceRatio(GLASS_ENHANCEMENT_DESTROY_CHANCE, probabilityMultiplier)} chance to break`,
    },
    steel: { name: "Steel", description: `×${STEEL_MULT_FACTOR} Mult while held in hand` },
    stone: { name: "Stone", description: `+${STONE_ENHANCEMENT_CHIPS} Chips, no rank or suit` },
    gold: { name: "Gold", description: `Earn +$${GOLD_HELD_BONUS_PER_CARD} if held at end of round` },
    lucky: {
      name: "Lucky",
      description: `${formatChanceRatio(LUCKY_ENHANCEMENT_MULT_CHANCE, probabilityMultiplier)} chance for +${LUCKY_ENHANCEMENT_MULT_AMOUNT} Mult, ${formatChanceRatio(LUCKY_ENHANCEMENT_MONEY_CHANCE, probabilityMultiplier)} chance for +$${LUCKY_ENHANCEMENT_MONEY_AMOUNT}`,
    },
  };
}

const DEFAULT_ENHANCEMENT_INFO = buildEnhancementInfo(1);

export interface CardInfo {
  readonly rank: string;
  readonly suitLabel: string;
  readonly suitGlyph: string;
  readonly suitClass: Suit;
  readonly chips: number;
  readonly bonusChips: number;
  readonly isStone: boolean;
  readonly enhancement?: EnhancementInfo;
  readonly seal?: SealInfo;
  readonly edition?: CardEditionInfo;
}

export interface GetCardInfoOptions {
  readonly probabilityMultiplier?: number;
  readonly suitLabel?: (suit: Suit) => string;
}

export function getCardInfo(
  card: Card,
  options: GetCardInfoOptions = {},
): CardInfo {
  const isStone = card.enhancement === "stone";
  const enhancementInfo =
    options.probabilityMultiplier !== undefined &&
    options.probabilityMultiplier !== 1
      ? buildEnhancementInfo(options.probabilityMultiplier)
      : DEFAULT_ENHANCEMENT_INFO;
  return {
    rank: card.rank,
    suitLabel: (options.suitLabel ?? ((suit) => SUIT_LABELS[suit]))(card.suit),
    suitGlyph: SUIT_GLYPHS[card.suit],
    suitClass: card.suit,
    chips: isStone ? 0 : getRankChips(card.rank),
    bonusChips: card.bonusChips ?? 0,
    isStone,
    enhancement: card.enhancement ? enhancementInfo[card.enhancement] : undefined,
    seal: card.seal ? getSealInfo(card.seal) : undefined,
    edition: card.edition ? CARD_EDITION_INFO[card.edition] : undefined,
  };
}
