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

const oneInN = (chance: number): string => `1-in-${Math.round(1 / chance)}`;

const ENHANCEMENT_INFO: Record<Enhancement, EnhancementInfo> = {
  bonus: { name: "Bonus", description: `+${BONUS_ENHANCEMENT_CHIPS} Chips when scored` },
  mult: { name: "Mult", description: `+${MULT_ENHANCEMENT_MULT_DELTA} Mult when scored` },
  wild: { name: "Wild", description: "Counts as every suit" },
  glass: {
    name: "Glass",
    description: `×${GLASS_ENHANCEMENT_MULT_TIMES} Mult when scored, ${oneInN(GLASS_ENHANCEMENT_DESTROY_CHANCE)} chance to break`,
  },
  steel: { name: "Steel", description: `×${STEEL_MULT_FACTOR} Mult while held in hand` },
  stone: { name: "Stone", description: `+${STONE_ENHANCEMENT_CHIPS} Chips, no rank or suit` },
  gold: { name: "Gold", description: `Earn +$${GOLD_HELD_BONUS_PER_CARD} if held at end of round` },
  lucky: {
    name: "Lucky",
    description: `${oneInN(LUCKY_ENHANCEMENT_MULT_CHANCE)} chance for +${LUCKY_ENHANCEMENT_MULT_AMOUNT} Mult, ${oneInN(LUCKY_ENHANCEMENT_MONEY_CHANCE)} chance for +$${LUCKY_ENHANCEMENT_MONEY_AMOUNT}`,
  },
};

export interface CardInfo {
  readonly rank: string;
  readonly suitLabel: string;
  readonly suitGlyph: string;
  readonly suitClass: Suit;
  readonly chips: number;
  readonly isStone: boolean;
  readonly enhancement?: EnhancementInfo;
  readonly seal?: SealInfo;
  readonly edition?: CardEditionInfo;
}

export function getCardInfo(card: Card): CardInfo {
  const isStone = card.enhancement === "stone";
  return {
    rank: card.rank,
    suitLabel: SUIT_LABELS[card.suit],
    suitGlyph: SUIT_GLYPHS[card.suit],
    suitClass: card.suit,
    chips: isStone ? 0 : getRankChips(card.rank),
    isStone,
    enhancement: card.enhancement ? ENHANCEMENT_INFO[card.enhancement] : undefined,
    seal: card.seal ? getSealInfo(card.seal) : undefined,
    edition: card.edition ? CARD_EDITION_INFO[card.edition] : undefined,
  };
}
