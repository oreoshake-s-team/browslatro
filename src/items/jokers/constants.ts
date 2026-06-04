import type { Rank, Suit } from "../../cards/types";
import { JOKER_BASE_PRICE } from "../../constants";
import type { JokerEdition, JokerRarity } from "./types";

export const MAX_JOKERS = 5;

export const JOKER_SELL_VALUE = Math.floor(JOKER_BASE_PRICE / 2);

export const BUSINESS_CARD_PROC_CHANCE = 0.5;
export const SUIT_MULT_AMOUNT = 3;
export const JOLLY_JOKER_MULT = 8;
export const ZANY_JOKER_MULT = 12;
export const MAD_JOKER_MULT = 10;
export const CRAZY_JOKER_MULT = 12;
export const DROLL_JOKER_MULT = 10;
export const SLY_JOKER_CHIPS = 50;
export const WILY_JOKER_CHIPS = 100;
export const CLEVER_JOKER_CHIPS = 80;
export const DEVIOUS_JOKER_CHIPS = 100;
export const CRAFTY_JOKER_CHIPS = 80;
export const EVEN_STEVEN_MULT = 4;
export const ODD_TODD_CHIPS = 31;
export const HALF_JOKER_MULT = 20;
export const HALF_JOKER_MAX_CARDS = 3;
export const MISPRINT_MIN_MULT = 0;
export const MISPRINT_MAX_MULT = 23;
export const SCARY_FACE_CHIPS = 30;
export const SMILEY_FACE_MULT = 5;
export const PHOTOGRAPH_X_MULT = 2;
export const FIBONACCI_MULT = 8;
export const FIBONACCI_RANKS: ReadonlyArray<Rank> = ["A", "2", "3", "5", "8"];
export const SCHOLAR_CHIPS = 20;
export const SCHOLAR_MULT = 4;
export const SCHOLAR_RANKS: ReadonlyArray<Rank> = ["A"];
export const WALKIE_TALKIE_CHIPS = 10;
export const WALKIE_TALKIE_MULT = 4;
export const WALKIE_TALKIE_RANKS: ReadonlyArray<Rank> = ["10", "4"];
export const BANNER_CHIPS_PER_DISCARD = 30;
export const MYSTIC_SUMMIT_MULT = 15;
export const BULL_CHIPS_PER_DOLLAR = 2;
export const THE_DUO_X_MULT = 2;
export const THE_TRIO_X_MULT = 3;
export const THE_FAMILY_X_MULT = 4;
export const THE_ORDER_X_MULT = 3;
export const THE_TRIBE_X_MULT = 2;
export const BARON_X_MULT = 1.5;
export const BARON_RANKS: ReadonlyArray<Rank> = ["K"];
export const SHOOT_THE_MOON_MULT = 13;
export const SHOOT_THE_MOON_RANKS: ReadonlyArray<Rank> = ["Q"];
export const RAISED_FIST_MULTIPLIER = 2;
export const ABSTRACT_JOKER_MULT_PER_JOKER = 3;
export const BOOTSTRAPS_MULT_PER_BUCKET = 2;
export const BOOTSTRAPS_BUCKET_DOLLARS = 5;
export const BLACKBOARD_X_MULT = 3;
export const BLACKBOARD_SUITS: ReadonlyArray<Suit> = ["spades", "clubs"];
export const BLOODSTONE_CHANCE = 0.5;
export const BLOODSTONE_X_MULT = 1.5;
export const RESERVED_PARKING_CHANCE = 0.5;
export const RESERVED_PARKING_PAYOUT = 1;
export const TRIBOULET_X_MULT = 2;
export const TRIBOULET_RANKS: ReadonlyArray<Rank> = ["K", "Q"];
export const ACROBAT_X_MULT = 3;
export const ARROWHEAD_CHIPS = 50;
export const ONYX_AGATE_MULT = 7;
export const ROUGH_GEM_MONEY = 1;
export const GOLDEN_JOKER_MONEY = 4;
export const DELAYED_GRATIFICATION_MONEY_PER_DISCARD = 2;
export const CLOUD_9_MONEY_PER_NINE = 1;
export const CLOUD_9_RANKS: ReadonlyArray<Rank> = ["9"];
export const STONE_JOKER_CHIPS_PER_STONE = 25;
export const STEEL_JOKER_X_MULT_PER_STEEL = 0.2;
export const DRIVERS_LICENSE_X_MULT = 3;
export const DRIVERS_LICENSE_ENHANCED_THRESHOLD = 16;
export const FACELESS_JOKER_FACE_THRESHOLD = 3;
export const FACELESS_JOKER_PAYOUT = 5;
export const TRADING_CARD_DISCARD_SIZE = 1;
export const TRADING_CARD_PAYOUT = 3;
export const EROSION_MULT_PER_MISSING_CARD = 4;
export const BLUE_JOKER_CHIPS_PER_REMAINING_CARD = 2;
export const BASEBALL_CARD_X_MULT_PER_UNCOMMON = 0.5;

export const FOIL_CHIPS = 50;
export const HOLOGRAPHIC_MULT = 10;
export const POLYCHROME_X_MULT = 1.5;

export const JOKER_EDITION_KINDS: ReadonlyArray<JokerEdition> = [
  "foil",
  "holographic",
  "polychrome",
  "negative",
];

export const JOKER_RARITIES: ReadonlyArray<JokerRarity> = [
  "common",
  "uncommon",
  "rare",
  "legendary",
];

export type RankParity = "even" | "odd" | "face";

export const RANK_PARITY: Record<Rank, RankParity> = {
  A: "odd",
  "2": "even",
  "3": "odd",
  "4": "even",
  "5": "odd",
  "6": "even",
  "7": "odd",
  "8": "even",
  "9": "odd",
  "10": "even",
  J: "face",
  Q: "face",
  K: "face",
};
