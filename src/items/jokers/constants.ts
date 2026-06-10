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
export const FLOWER_POT_X_MULT = 3;
export const SEEING_DOUBLE_X_MULT = 2;
export const JUGGLER_HAND_SIZE_BONUS = 1;
export const DRUNKARD_DISCARDS_BONUS = 1;
export const MERRY_ANDY_DISCARDS = 3;
export const MERRY_ANDY_HAND_SIZE = -1;
export const TROUBADOUR_HAND_SIZE = 2;
export const TROUBADOUR_HANDS = -1;
export const STUNTMAN_CHIPS = 250;
export const STUNTMAN_HAND_SIZE = -2;
export const CREDIT_CARD_DEBT_FLOOR = 20;
export const BURGLAR_HANDS = 3;
export const BURGLAR_DISCARDS_OVERRIDE = 0;
export const SPARE_TROUSERS_MULT_PER_TWO_PAIR = 2;
export const RUNNER_CHIPS_PER_STRAIGHT = 15;
export const SQUARE_JOKER_CARD_COUNT = 4;
export const SQUARE_JOKER_CHIPS_PER_FOUR_CARD = 4;
export const WEE_JOKER_CHIPS_PER_TWO = 8;
export const RIDE_THE_BUS_MULT_PER_FACELESS_HAND = 1;
export const LOYALTY_CARD_HANDS_PER_TRIGGER = 6;
export const LOYALTY_CARD_X_MULT = 4;
export const GREEN_JOKER_MULT_PER_HAND = 1;
export const GREEN_JOKER_MULT_PER_DISCARD = 1;
export const CARD_SHARP_X_MULT = 3;
export const THROWBACK_X_MULT_PER_SKIP = 0.25;
export const HOLOGRAM_X_MULT_PER_ADDED_CARD = 0.25;
export const FLASH_CARD_MULT_PER_REROLL = 2;
export const ICE_CREAM_CHIPS = 100;
export const ICE_CREAM_CHIPS_LOSS_PER_HAND = 5;
export const POPCORN_MULT = 20;
export const POPCORN_MULT_LOSS_PER_ROUND = 4;
export const RAMEN_X_MULT = 2;
export const RAMEN_X_MULT_LOSS_PER_CARD = 0.01;
export const GROS_MICHEL_MULT = 15;
export const GROS_MICHEL_BUST_CHANCE = 1 / 6;
export const HACK_RANKS: ReadonlyArray<Rank> = ["2", "3", "4", "5"];
export const HACK_RETRIGGERS = 1;
export const DUSK_RETRIGGERS = 1;
export const SOCK_AND_BUSKIN_RETRIGGERS = 1;
export const HANGING_CHAD_RETRIGGERS = 2;
export const RED_CARD_MULT_PER_SKIPPED_PACK = 3;
export const HIT_THE_ROAD_X_MULT_PER_JACK = 0.5;
export const LUCKY_CAT_X_MULT_PER_TRIGGER = 0.25;
export const EGG_SELL_VALUE_PER_ROUND = 3;
export const FORTUNE_TELLER_MULT_PER_TAROT = 1;
export const CONSTELLATION_X_MULT_PER_PLANET = 0.1;
export const CAMPFIRE_X_MULT_PER_SOLD_CARD = 0.25;
export const OBELISK_X_MULT_PER_CONSECUTIVE_HAND = 0.2;
export const ROCKET_BASE_PAYOUT = 1;
export const ROCKET_PAYOUT_GROWTH_PER_BOSS = 2;
export const TURTLE_BEAN_HAND_SIZE = 5;
export const TURTLE_BEAN_LOSS_PER_ROUND = 1;
export const SELTZER_HANDS = 10;
export const SELTZER_RETRIGGERS = 1;
export const MIME_HELD_RETRIGGERS = 1;
export const VAMPIRE_X_MULT_PER_ENHANCED = 0.1;
export const HIKER_CHIPS_PER_SCORED = 5;
export const CAVENDISH_X_MULT = 3;
export const CAVENDISH_BUST_CHANCE = 1 / 1000;
export const MR_BONES_SAVE_THRESHOLD = 0.25;
export const THE_IDOL_X_MULT = 2;
export const ANCIENT_JOKER_X_MULT = 1.5;
export const CASTLE_CHIPS_PER_DISCARD = 3;
export const EIGHT_BALL_TAROT_CHANCE = 0.25;
export const VAGABOND_MONEY_THRESHOLD = 4;
export const HALLUCINATION_TAROT_CHANCE = 0.5;
export const RIFF_RAFF_JOKER_COUNT = 2;
export const MAIL_IN_REBATE_PAYOUT = 5;
export const SATELLITE_MONEY_PER_PLANET = 1;
export const GLASS_JOKER_X_MULT_PER_SHATTER = 0.75;
export const TO_DO_LIST_PAYOUT = 4;
export const MADNESS_X_MULT_PER_BLIND = 0.5;
export const MATADOR_PAYOUT = 8;
export const GIFT_CARD_SELL_VALUE_PER_ROUND = 1;
export const CANIO_X_MULT_PER_FACE = 1;
export const INVISIBLE_JOKER_ROUNDS = 2;

export const FOIL_CHIPS = 50;
export const HOLOGRAPHIC_MULT = 10;
export const POLYCHROME_X_MULT = 1.5;

export const EDITION_BASE_RATES: Readonly<
  Record<"foil" | "holographic" | "polychrome", number>
> = {
  foil: 0.04,
  holographic: 0.02,
  polychrome: 0.003,
};

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
