import type { Card, Enhancement, Rank, Suit } from "../cards/types";
import { rollChance } from "../dev/chanceOverride";
import { type HandLabel, handContains } from "../scoring/handEvaluator";
import { getRankChips } from "../scoring/scoring";
import { JOKER_BASE_PRICE } from "../constants";

export const MAX_JOKERS = 5;

export const JOKER_SELL_VALUE = Math.floor(JOKER_BASE_PRICE / 2);

export function jokerSellValue(_joker: Joker): number {
  return JOKER_SELL_VALUE;
}
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

const FACE_RANKS: ReadonlySet<Rank> = new Set<Rank>(["J", "Q", "K"]);

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

export type RandomSource = () => number;

export type JokerEffect =
  | { readonly kind: "additive-mult"; readonly amount: number }
  | { readonly kind: "business-card"; readonly chance: number; readonly payout: number }
  | { readonly kind: "stencil" }
  | { readonly kind: "per-suit-mult"; readonly suit: Suit; readonly amount: number }
  | {
      readonly kind: "on-hand-type-mult";
      readonly requires: HandLabel;
      readonly amount: number;
    }
  | {
      readonly kind: "on-hand-type-chips";
      readonly requires: HandLabel;
      readonly amount: number;
    }
  | {
      readonly kind: "on-hand-type-x-mult";
      readonly requires: HandLabel;
      readonly amount: number;
    }
  | {
      readonly kind: "per-scored-rank-parity";
      readonly parity: "even" | "odd";
      readonly contribution:
        | { readonly kind: "mult"; readonly amount: number }
        | { readonly kind: "chips"; readonly amount: number };
    }
  | {
      readonly kind: "additive-mult-when-hand-size";
      readonly maxCardsPlayed: number;
      readonly amount: number;
    }
  | {
      readonly kind: "additive-mult-random";
      readonly min: number;
      readonly max: number;
    }
  | {
      readonly kind: "per-scored-face";
      readonly contribution:
        | { readonly kind: "mult"; readonly amount: number }
        | { readonly kind: "chips"; readonly amount: number };
    }
  | {
      readonly kind: "x-mult-on-face-scored";
      readonly amount: number;
    }
  | {
      readonly kind: "per-scored-rank";
      readonly ranks: ReadonlyArray<Rank>;
      readonly mult?: number;
      readonly chips?: number;
    }
  | { readonly kind: "per-remaining-discard-chips"; readonly amount: number }
  | { readonly kind: "mult-when-no-discards"; readonly amount: number }
  | { readonly kind: "per-dollar-chips"; readonly amount: number }
  | {
      readonly kind: "per-held-rank";
      readonly ranks: ReadonlyArray<Rank>;
      readonly mult?: number;
      readonly xMult?: number;
    }
  | {
      readonly kind: "held-lowest-rank-mult";
      readonly multiplier: number;
    }
  | { readonly kind: "per-joker-count-mult"; readonly amount: number }
  | {
      readonly kind: "per-money-bucket-mult";
      readonly bucket: number;
      readonly amount: number;
    }
  | {
      readonly kind: "x-mult-when-held-suits-all-in";
      readonly suits: ReadonlyArray<Suit>;
      readonly amount: number;
    }
  | {
      readonly kind: "per-suit-chance-x-mult";
      readonly suit: Suit;
      readonly chance: number;
      readonly amount: number;
    }
  | { readonly kind: "other-jokers-sell-value-mult" }
  | {
      readonly kind: "per-held-face-chance-money";
      readonly chance: number;
      readonly payout: number;
    }
  | {
      readonly kind: "per-scored-rank-x-mult";
      readonly ranks: ReadonlyArray<Rank>;
      readonly amount: number;
    }
  | { readonly kind: "x-mult-on-final-hand"; readonly amount: number }
  | { readonly kind: "per-suit-chips"; readonly suit: Suit; readonly amount: number }
  | { readonly kind: "per-suit-money"; readonly suit: Suit; readonly amount: number }
  | {
      readonly kind: "per-enhanced-in-deck-chips";
      readonly enhancement: Enhancement;
      readonly amount: number;
    }
  | {
      readonly kind: "per-enhanced-in-deck-x-mult";
      readonly enhancement: Enhancement;
      readonly amount: number;
    }
  | {
      readonly kind: "x-mult-when-enhanced-count-at-least";
      readonly threshold: number;
      readonly amount: number;
    }
  | {
      readonly kind: "on-discard-money-when-face-count-at-least";
      readonly threshold: number;
      readonly payout: number;
    }
  | {
      readonly kind: "on-first-discard-of-round-money-when-size";
      readonly size: number;
      readonly payout: number;
    }
  | { readonly kind: "end-of-round-money"; readonly amount: number }
  | {
      readonly kind: "per-remaining-discard-end-of-round-money";
      readonly amount: number;
    }
  | {
      readonly kind: "per-rank-in-deck-end-of-round-money";
      readonly ranks: ReadonlyArray<Rank>;
      readonly amount: number;
    };

export type JokerEdition = "foil" | "holographic" | "polychrome" | "negative";

export const JOKER_EDITION_KINDS: ReadonlyArray<JokerEdition> = [
  "foil",
  "holographic",
  "polychrome",
  "negative",
];

export const FOIL_CHIPS = 50;
export const HOLOGRAPHIC_MULT = 10;
export const POLYCHROME_X_MULT = 1.5;

export interface JokerEditionInfo {
  readonly name: string;
  readonly description: string;
}

export const JOKER_EDITION_INFO: Readonly<Record<JokerEdition, JokerEditionInfo>> = {
  foil: { name: "Foil", description: `+${FOIL_CHIPS} chips when scored` },
  holographic: {
    name: "Holographic",
    description: `+${HOLOGRAPHIC_MULT} Mult when scored`,
  },
  polychrome: {
    name: "Polychrome",
    description: `×${POLYCHROME_X_MULT} Mult when scored`,
  },
  negative: { name: "Negative", description: "+1 Joker slot" },
};

export type JokerRarity = "common" | "uncommon" | "rare" | "legendary";

export const JOKER_RARITIES: ReadonlyArray<JokerRarity> = [
  "common",
  "uncommon",
  "rare",
  "legendary",
];

export interface Joker {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly effect: JokerEffect;
  readonly rarity: JokerRarity;
  readonly edition?: JokerEdition;
}

export function withEdition(joker: Joker, edition: JokerEdition): Joker {
  return { ...joker, edition };
}

export function applyEditionToRandomJoker(
  jokers: ReadonlyArray<Joker>,
  edition: JokerEdition,
  rng: RandomSource = Math.random,
): Joker[] {
  if (jokers.length === 0) return [...jokers];
  const idx = Math.floor(rng() * jokers.length);
  return jokers.map((joker, i) => (i === idx ? withEdition(joker, edition) : joker));
}

export function withoutEdition(joker: Joker): Joker {
  const { edition: _edition, ...rest } = joker;
  return rest;
}

export function cloneJoker(joker: Joker): Joker {
  return { ...joker };
}

export function effectiveJokerCount(jokers: ReadonlyArray<Joker>): number {
  let count = 0;
  for (const j of jokers) if (j.edition !== "negative") count += 1;
  return count;
}

export function pickRandomEquipped(
  jokers: ReadonlyArray<Joker>,
  rng: RandomSource = Math.random,
): Joker | null {
  if (jokers.length === 0) return null;
  return jokers[Math.floor(rng() * jokers.length)];
}

export function pickRandomFromCatalog(
  catalog: ReadonlyArray<Joker>,
  filter: (j: Joker) => boolean,
  rng: RandomSource = Math.random,
): Joker | null {
  const pool = catalog.filter(filter);
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}

export function createJokerByRarity(
  jokers: ReadonlyArray<Joker>,
  catalog: ReadonlyArray<Joker>,
  rarity: JokerRarity,
  capacity: number,
  rng: RandomSource = Math.random,
): Joker | null {
  if (effectiveJokerCount(jokers) >= capacity) return null;
  const ownedIds = new Set(jokers.map((j) => j.id));
  return pickRandomFromCatalog(
    catalog,
    (j) => j.rarity === rarity && !ownedIds.has(j.id),
    rng,
  );
}

export function replaceJokersExceptCopyOf(
  jokers: ReadonlyArray<Joker>,
  idx: number,
): Joker[] {
  if (idx < 0 || idx >= jokers.length) return [...jokers];
  return [cloneJoker(jokers[idx])];
}

export function polychromeRandomJokerDestroyOthers(
  jokers: ReadonlyArray<Joker>,
  rng: RandomSource = Math.random,
): Joker[] {
  if (jokers.length === 0) return [];
  const idx = Math.floor(rng() * jokers.length);
  return [withEdition(jokers[idx], "polychrome")];
}

export function copyRandomJokerDestroyOthers(
  jokers: ReadonlyArray<Joker>,
  rng: RandomSource = Math.random,
): Joker[] {
  if (jokers.length === 0) return [];
  const idx = Math.floor(rng() * jokers.length);
  const chosen = jokers[idx];
  return [chosen, cloneJoker(chosen)];
}

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
}

export function createPlusFourMultJoker(): Joker {
  return {
    id: "plus-four-mult",
    rarity: "common",
    name: "+4 Mult",
    description: "Adds +4 Mult to every played hand",
    effect: { kind: "additive-mult", amount: 4 },
  };
}

export function createBusinessCardJoker(): Joker {
  return {
    id: "business-card",
    rarity: "common",
    name: "Business Card",
    description: "Each scored face card has a 50% chance to give +$1",
    effect: {
      kind: "business-card",
      chance: BUSINESS_CARD_PROC_CHANCE,
      payout: 1,
    },
  };
}

export function createJokerStencilJoker(): Joker {
  return {
    id: "joker-stencil",
    rarity: "uncommon",
    name: "Joker Stencil",
    description: "X1 Mult per empty joker slot",
    effect: { kind: "stencil" },
  };
}

export function createGreedyJoker(): Joker {
  return {
    id: "greedy-joker",
    rarity: "common",
    name: "Greedy Joker",
    description: "+3 Mult per scored Diamond",
    effect: { kind: "per-suit-mult", suit: "diamonds", amount: SUIT_MULT_AMOUNT },
  };
}

export function createLustyJoker(): Joker {
  return {
    id: "lusty-joker",
    rarity: "common",
    name: "Lusty Joker",
    description: "+3 Mult per scored Heart",
    effect: { kind: "per-suit-mult", suit: "hearts", amount: SUIT_MULT_AMOUNT },
  };
}

export function createWrathfulJoker(): Joker {
  return {
    id: "wrathful-joker",
    rarity: "common",
    name: "Wrathful Joker",
    description: "+3 Mult per scored Spade",
    effect: { kind: "per-suit-mult", suit: "spades", amount: SUIT_MULT_AMOUNT },
  };
}

export function createGluttonousJoker(): Joker {
  return {
    id: "gluttonous-joker",
    rarity: "common",
    name: "Gluttonous Joker",
    description: "+3 Mult per scored Club",
    effect: { kind: "per-suit-mult", suit: "clubs", amount: SUIT_MULT_AMOUNT },
  };
}

export function createJollyJoker(): Joker {
  return {
    id: "jolly-joker",
    rarity: "common",
    name: "Jolly Joker",
    description: "+8 Mult if played hand contains a Pair",
    effect: { kind: "on-hand-type-mult", requires: "Pair", amount: JOLLY_JOKER_MULT },
  };
}

export function createZanyJoker(): Joker {
  return {
    id: "zany-joker",
    rarity: "common",
    name: "Zany Joker",
    description: "+12 Mult if played hand contains Three of a Kind",
    effect: {
      kind: "on-hand-type-mult",
      requires: "Three of a Kind",
      amount: ZANY_JOKER_MULT,
    },
  };
}

export function createMadJoker(): Joker {
  return {
    id: "mad-joker",
    rarity: "common",
    name: "Mad Joker",
    description: "+10 Mult if played hand contains Two Pair",
    effect: {
      kind: "on-hand-type-mult",
      requires: "Two Pair",
      amount: MAD_JOKER_MULT,
    },
  };
}

export function createCrazyJoker(): Joker {
  return {
    id: "crazy-joker",
    rarity: "common",
    name: "Crazy Joker",
    description: "+12 Mult if played hand contains a Straight",
    effect: {
      kind: "on-hand-type-mult",
      requires: "Straight",
      amount: CRAZY_JOKER_MULT,
    },
  };
}

export function createDrollJoker(): Joker {
  return {
    id: "droll-joker",
    rarity: "common",
    name: "Droll Joker",
    description: "+10 Mult if played hand contains a Flush",
    effect: {
      kind: "on-hand-type-mult",
      requires: "Flush",
      amount: DROLL_JOKER_MULT,
    },
  };
}

export function createSlyJoker(): Joker {
  return {
    id: "sly-joker",
    rarity: "common",
    name: "Sly Joker",
    description: "+50 Chips if played hand contains a Pair",
    effect: {
      kind: "on-hand-type-chips",
      requires: "Pair",
      amount: SLY_JOKER_CHIPS,
    },
  };
}

export function createWilyJoker(): Joker {
  return {
    id: "wily-joker",
    rarity: "common",
    name: "Wily Joker",
    description: "+100 Chips if played hand contains Three of a Kind",
    effect: {
      kind: "on-hand-type-chips",
      requires: "Three of a Kind",
      amount: WILY_JOKER_CHIPS,
    },
  };
}

export function createCleverJoker(): Joker {
  return {
    id: "clever-joker",
    rarity: "common",
    name: "Clever Joker",
    description: "+80 Chips if played hand contains Two Pair",
    effect: {
      kind: "on-hand-type-chips",
      requires: "Two Pair",
      amount: CLEVER_JOKER_CHIPS,
    },
  };
}

export function createDeviousJoker(): Joker {
  return {
    id: "devious-joker",
    rarity: "common",
    name: "Devious Joker",
    description: "+100 Chips if played hand contains a Straight",
    effect: {
      kind: "on-hand-type-chips",
      requires: "Straight",
      amount: DEVIOUS_JOKER_CHIPS,
    },
  };
}

export function createCraftyJoker(): Joker {
  return {
    id: "crafty-joker",
    rarity: "common",
    name: "Crafty Joker",
    description: "+80 Chips if played hand contains a Flush",
    effect: {
      kind: "on-hand-type-chips",
      requires: "Flush",
      amount: CRAFTY_JOKER_CHIPS,
    },
  };
}

export function createTheDuoJoker(): Joker {
  return {
    id: "the-duo",
    rarity: "uncommon",
    name: "The Duo",
    description: `X${THE_DUO_X_MULT} Mult if played hand contains a Pair`,
    effect: {
      kind: "on-hand-type-x-mult",
      requires: "Pair",
      amount: THE_DUO_X_MULT,
    },
  };
}

export function createTheTrioJoker(): Joker {
  return {
    id: "the-trio",
    rarity: "uncommon",
    name: "The Trio",
    description: `X${THE_TRIO_X_MULT} Mult if played hand contains Three of a Kind`,
    effect: {
      kind: "on-hand-type-x-mult",
      requires: "Three of a Kind",
      amount: THE_TRIO_X_MULT,
    },
  };
}

export function createTheFamilyJoker(): Joker {
  return {
    id: "the-family",
    rarity: "uncommon",
    name: "The Family",
    description: `X${THE_FAMILY_X_MULT} Mult if played hand contains Four of a Kind`,
    effect: {
      kind: "on-hand-type-x-mult",
      requires: "Four of a Kind",
      amount: THE_FAMILY_X_MULT,
    },
  };
}

export function createTheOrderJoker(): Joker {
  return {
    id: "the-order",
    rarity: "uncommon",
    name: "The Order",
    description: `X${THE_ORDER_X_MULT} Mult if played hand contains a Straight`,
    effect: {
      kind: "on-hand-type-x-mult",
      requires: "Straight",
      amount: THE_ORDER_X_MULT,
    },
  };
}

export function createTheTribeJoker(): Joker {
  return {
    id: "the-tribe",
    rarity: "uncommon",
    name: "The Tribe",
    description: `X${THE_TRIBE_X_MULT} Mult if played hand contains a Flush`,
    effect: {
      kind: "on-hand-type-x-mult",
      requires: "Flush",
      amount: THE_TRIBE_X_MULT,
    },
  };
}

export function createEvenStevenJoker(): Joker {
  return {
    id: "even-steven",
    rarity: "common",
    name: "Even Steven",
    description: `+${EVEN_STEVEN_MULT} Mult per scored even-rank card (2, 4, 6, 8, 10)`,
    effect: {
      kind: "per-scored-rank-parity",
      parity: "even",
      contribution: { kind: "mult", amount: EVEN_STEVEN_MULT },
    },
  };
}

export function createOddToddJoker(): Joker {
  return {
    id: "odd-todd",
    rarity: "common",
    name: "Odd Todd",
    description: `+${ODD_TODD_CHIPS} Chips per scored odd-rank card (A, 3, 5, 7, 9)`,
    effect: {
      kind: "per-scored-rank-parity",
      parity: "odd",
      contribution: { kind: "chips", amount: ODD_TODD_CHIPS },
    },
  };
}

export function createHalfJoker(): Joker {
  return {
    id: "half-joker",
    rarity: "common",
    name: "Half Joker",
    description: `+${HALF_JOKER_MULT} Mult if the played hand has ${HALF_JOKER_MAX_CARDS} or fewer cards`,
    effect: {
      kind: "additive-mult-when-hand-size",
      maxCardsPlayed: HALF_JOKER_MAX_CARDS,
      amount: HALF_JOKER_MULT,
    },
  };
}

export function createMisprintJoker(): Joker {
  return {
    id: "misprint",
    rarity: "uncommon",
    name: "Misprint",
    description: `+${MISPRINT_MIN_MULT}..+${MISPRINT_MAX_MULT} random Mult per played hand`,
    effect: {
      kind: "additive-mult-random",
      min: MISPRINT_MIN_MULT,
      max: MISPRINT_MAX_MULT,
    },
  };
}

export function createScaryFaceJoker(): Joker {
  return {
    id: "scary-face",
    rarity: "common",
    name: "Scary Face",
    description: `+${SCARY_FACE_CHIPS} Chips per scored face card (J, Q, K)`,
    effect: {
      kind: "per-scored-face",
      contribution: { kind: "chips", amount: SCARY_FACE_CHIPS },
    },
  };
}

export function createSmileyFaceJoker(): Joker {
  return {
    id: "smiley-face",
    rarity: "common",
    name: "Smiley Face",
    description: `+${SMILEY_FACE_MULT} Mult per scored face card (J, Q, K)`,
    effect: {
      kind: "per-scored-face",
      contribution: { kind: "mult", amount: SMILEY_FACE_MULT },
    },
  };
}

export function createPhotographJoker(): Joker {
  return {
    id: "photograph",
    rarity: "common",
    name: "Photograph",
    description: `X${PHOTOGRAPH_X_MULT} Mult when the first face card is scored in a hand`,
    effect: {
      kind: "x-mult-on-face-scored",
      amount: PHOTOGRAPH_X_MULT,
    },
  };
}

export function createFibonacciJoker(): Joker {
  return {
    id: "fibonacci",
    rarity: "uncommon",
    name: "Fibonacci",
    description: `+${FIBONACCI_MULT} Mult per scored Ace, 2, 3, 5, or 8`,
    effect: {
      kind: "per-scored-rank",
      ranks: FIBONACCI_RANKS,
      mult: FIBONACCI_MULT,
    },
  };
}

export function createScholarJoker(): Joker {
  return {
    id: "scholar",
    rarity: "common",
    name: "Scholar",
    description: `+${SCHOLAR_CHIPS} Chips and +${SCHOLAR_MULT} Mult per scored Ace`,
    effect: {
      kind: "per-scored-rank",
      ranks: SCHOLAR_RANKS,
      chips: SCHOLAR_CHIPS,
      mult: SCHOLAR_MULT,
    },
  };
}

export function createWalkieTalkieJoker(): Joker {
  return {
    id: "walkie-talkie",
    rarity: "common",
    name: "Walkie Talkie",
    description: `+${WALKIE_TALKIE_CHIPS} Chips and +${WALKIE_TALKIE_MULT} Mult per scored 10 or 4`,
    effect: {
      kind: "per-scored-rank",
      ranks: WALKIE_TALKIE_RANKS,
      chips: WALKIE_TALKIE_CHIPS,
      mult: WALKIE_TALKIE_MULT,
    },
  };
}

export function createBannerJoker(): Joker {
  return {
    id: "banner",
    rarity: "common",
    name: "Banner",
    description: `+${BANNER_CHIPS_PER_DISCARD} Chips for each remaining discard`,
    effect: {
      kind: "per-remaining-discard-chips",
      amount: BANNER_CHIPS_PER_DISCARD,
    },
  };
}

export function createMysticSummitJoker(): Joker {
  return {
    id: "mystic-summit",
    rarity: "common",
    name: "Mystic Summit",
    description: `+${MYSTIC_SUMMIT_MULT} Mult when you have 0 discards remaining`,
    effect: { kind: "mult-when-no-discards", amount: MYSTIC_SUMMIT_MULT },
  };
}

export function createBullJoker(): Joker {
  return {
    id: "bull",
    rarity: "uncommon",
    name: "Bull",
    description: `+${BULL_CHIPS_PER_DOLLAR} Chips for each $1 you have`,
    effect: { kind: "per-dollar-chips", amount: BULL_CHIPS_PER_DOLLAR },
  };
}

export function createBaronJoker(): Joker {
  return {
    id: "baron",
    rarity: "rare",
    name: "Baron",
    description: `Each King held in hand gives X${BARON_X_MULT} Mult`,
    effect: {
      kind: "per-held-rank",
      ranks: BARON_RANKS,
      xMult: BARON_X_MULT,
    },
  };
}

export function createShootTheMoonJoker(): Joker {
  return {
    id: "shoot-the-moon",
    rarity: "common",
    name: "Shoot the Moon",
    description: `Each Queen held in hand gives +${SHOOT_THE_MOON_MULT} Mult`,
    effect: {
      kind: "per-held-rank",
      ranks: SHOOT_THE_MOON_RANKS,
      mult: SHOOT_THE_MOON_MULT,
    },
  };
}

export function createRaisedFistJoker(): Joker {
  return {
    id: "raised-fist",
    rarity: "common",
    name: "Raised Fist",
    description:
      "Adds double the rank of the lowest-ranked card held in hand to Mult",
    effect: {
      kind: "held-lowest-rank-mult",
      multiplier: RAISED_FIST_MULTIPLIER,
    },
  };
}

export function createAbstractJoker(): Joker {
  return {
    id: "abstract-joker",
    rarity: "common",
    name: "Abstract Joker",
    description: `+${ABSTRACT_JOKER_MULT_PER_JOKER} Mult for each Joker`,
    effect: {
      kind: "per-joker-count-mult",
      amount: ABSTRACT_JOKER_MULT_PER_JOKER,
    },
  };
}

export function createBootstrapsJoker(): Joker {
  return {
    id: "bootstraps",
    rarity: "uncommon",
    name: "Bootstraps",
    description: `+${BOOTSTRAPS_MULT_PER_BUCKET} Mult for every $${BOOTSTRAPS_BUCKET_DOLLARS} you have`,
    effect: {
      kind: "per-money-bucket-mult",
      bucket: BOOTSTRAPS_BUCKET_DOLLARS,
      amount: BOOTSTRAPS_MULT_PER_BUCKET,
    },
  };
}

export function createBlackboardJoker(): Joker {
  return {
    id: "blackboard",
    rarity: "uncommon",
    name: "Blackboard",
    description: `X${BLACKBOARD_X_MULT} Mult if all cards held in hand are Spades or Clubs`,
    effect: {
      kind: "x-mult-when-held-suits-all-in",
      suits: BLACKBOARD_SUITS,
      amount: BLACKBOARD_X_MULT,
    },
  };
}

export function createBloodstoneJoker(): Joker {
  return {
    id: "bloodstone",
    rarity: "uncommon",
    name: "Bloodstone",
    description: `Each scored Heart has a 1 in ${Math.round(1 / BLOODSTONE_CHANCE)} chance to give X${BLOODSTONE_X_MULT} Mult`,
    effect: {
      kind: "per-suit-chance-x-mult",
      suit: "hearts",
      chance: BLOODSTONE_CHANCE,
      amount: BLOODSTONE_X_MULT,
    },
  };
}

export function createSwashbucklerJoker(): Joker {
  return {
    id: "swashbuckler",
    rarity: "common",
    name: "Swashbuckler",
    description: "Adds the sell value of all other equipped Jokers to Mult",
    effect: { kind: "other-jokers-sell-value-mult" },
  };
}

export function createReservedParkingJoker(): Joker {
  return {
    id: "reserved-parking",
    rarity: "common",
    name: "Reserved Parking",
    description: `Each face card held in hand has a 1 in ${Math.round(1 / RESERVED_PARKING_CHANCE)} chance to give $${RESERVED_PARKING_PAYOUT}`,
    effect: {
      kind: "per-held-face-chance-money",
      chance: RESERVED_PARKING_CHANCE,
      payout: RESERVED_PARKING_PAYOUT,
    },
  };
}

export function createArrowheadJoker(): Joker {
  return {
    id: "arrowhead",
    rarity: "uncommon",
    name: "Arrowhead",
    description: `+${ARROWHEAD_CHIPS} Chips per scored Spade`,
    effect: { kind: "per-suit-chips", suit: "spades", amount: ARROWHEAD_CHIPS },
  };
}

export function createOnyxAgateJoker(): Joker {
  return {
    id: "onyx-agate",
    rarity: "uncommon",
    name: "Onyx Agate",
    description: `+${ONYX_AGATE_MULT} Mult per scored Club`,
    effect: { kind: "per-suit-mult", suit: "clubs", amount: ONYX_AGATE_MULT },
  };
}

export function createRoughGemJoker(): Joker {
  return {
    id: "rough-gem",
    rarity: "uncommon",
    name: "Rough Gem",
    description: `+$${ROUGH_GEM_MONEY} per scored Diamond`,
    effect: { kind: "per-suit-money", suit: "diamonds", amount: ROUGH_GEM_MONEY },
  };
}

export function createGoldenJoker(): Joker {
  return {
    id: "golden-joker",
    rarity: "common",
    name: "Golden Joker",
    description: `Earn $${GOLDEN_JOKER_MONEY} at end of round`,
    effect: { kind: "end-of-round-money", amount: GOLDEN_JOKER_MONEY },
  };
}

export function createDelayedGratificationJoker(): Joker {
  return {
    id: "delayed-gratification",
    rarity: "common",
    name: "Delayed Gratification",
    description: `Earn $${DELAYED_GRATIFICATION_MONEY_PER_DISCARD} per remaining discard at end of round, if no discards were used this round`,
    effect: {
      kind: "per-remaining-discard-end-of-round-money",
      amount: DELAYED_GRATIFICATION_MONEY_PER_DISCARD,
    },
  };
}

export function createCloud9Joker(): Joker {
  return {
    id: "cloud-9",
    rarity: "uncommon",
    name: "Cloud 9",
    description: `Earn $${CLOUD_9_MONEY_PER_NINE} for each 9 in your full deck at end of round`,
    effect: {
      kind: "per-rank-in-deck-end-of-round-money",
      ranks: CLOUD_9_RANKS,
      amount: CLOUD_9_MONEY_PER_NINE,
    },
  };
}

export function createStoneJoker(): Joker {
  return {
    id: "stone-joker",
    rarity: "common",
    name: "Stone Joker",
    description: `+${STONE_JOKER_CHIPS_PER_STONE} Chips for each Stone Card in your full deck`,
    effect: {
      kind: "per-enhanced-in-deck-chips",
      enhancement: "stone",
      amount: STONE_JOKER_CHIPS_PER_STONE,
    },
  };
}

export function createSteelJoker(): Joker {
  return {
    id: "steel-joker",
    rarity: "uncommon",
    name: "Steel Joker",
    description: `Gives X(1 + ${STEEL_JOKER_X_MULT_PER_STEEL} × N) Mult, where N is the number of Steel Cards in your full deck`,
    effect: {
      kind: "per-enhanced-in-deck-x-mult",
      enhancement: "steel",
      amount: STEEL_JOKER_X_MULT_PER_STEEL,
    },
  };
}

export function createDriversLicenseJoker(): Joker {
  return {
    id: "drivers-license",
    rarity: "rare",
    name: "Driver's License",
    description: `X${DRIVERS_LICENSE_X_MULT} Mult if you have at least ${DRIVERS_LICENSE_ENHANCED_THRESHOLD} Enhanced cards in your full deck`,
    effect: {
      kind: "x-mult-when-enhanced-count-at-least",
      threshold: DRIVERS_LICENSE_ENHANCED_THRESHOLD,
      amount: DRIVERS_LICENSE_X_MULT,
    },
  };
}

export function createFacelessJoker(): Joker {
  return {
    id: "faceless-joker",
    rarity: "common",
    name: "Faceless Joker",
    description: `Earn $${FACELESS_JOKER_PAYOUT} if ${FACELESS_JOKER_FACE_THRESHOLD} or more face cards are discarded at the same time`,
    effect: {
      kind: "on-discard-money-when-face-count-at-least",
      threshold: FACELESS_JOKER_FACE_THRESHOLD,
      payout: FACELESS_JOKER_PAYOUT,
    },
  };
}

export function createTradingCardJoker(): Joker {
  return {
    id: "trading-card",
    rarity: "uncommon",
    name: "Trading Card",
    description: `If your first discard of the round has only ${TRADING_CARD_DISCARD_SIZE} card, earn $${TRADING_CARD_PAYOUT} and destroy it`,
    effect: {
      kind: "on-first-discard-of-round-money-when-size",
      size: TRADING_CARD_DISCARD_SIZE,
      payout: TRADING_CARD_PAYOUT,
    },
  };
}

export const YORICK_MULT = 30;

export function createYorickJoker(): Joker {
  return {
    id: "yorick",
    rarity: "legendary",
    name: "Yorick",
    description: `+${YORICK_MULT} Mult on every played hand`,
    effect: { kind: "additive-mult", amount: YORICK_MULT },
  };
}

export function createTribouletJoker(): Joker {
  return {
    id: "triboulet",
    rarity: "legendary",
    name: "Triboulet",
    description: `X${TRIBOULET_X_MULT} Mult per scored King or Queen`,
    effect: {
      kind: "per-scored-rank-x-mult",
      ranks: TRIBOULET_RANKS,
      amount: TRIBOULET_X_MULT,
    },
  };
}

export function createAcrobatJoker(): Joker {
  return {
    id: "acrobat",
    rarity: "uncommon",
    name: "Acrobat",
    description: `X${ACROBAT_X_MULT} Mult on the final hand of the round`,
    effect: { kind: "x-mult-on-final-hand", amount: ACROBAT_X_MULT },
  };
}

export const initialJokersConfig: { factory: () => Joker[] } = {
  factory: () => [],
};

export function createLegendaryJokerCatalog(): Joker[] {
  return [createYorickJoker(), createTribouletJoker()];
}

export function createJokerCatalog(): Joker[] {
  return [
    createPlusFourMultJoker(),
    createBusinessCardJoker(),
    createJokerStencilJoker(),
    createGreedyJoker(),
    createLustyJoker(),
    createWrathfulJoker(),
    createGluttonousJoker(),
    createJollyJoker(),
    createZanyJoker(),
    createMadJoker(),
    createCrazyJoker(),
    createDrollJoker(),
    createSlyJoker(),
    createWilyJoker(),
    createCleverJoker(),
    createDeviousJoker(),
    createCraftyJoker(),
    createTheDuoJoker(),
    createTheTrioJoker(),
    createTheFamilyJoker(),
    createTheOrderJoker(),
    createTheTribeJoker(),
    createEvenStevenJoker(),
    createOddToddJoker(),
    createHalfJoker(),
    createMisprintJoker(),
    createScaryFaceJoker(),
    createSmileyFaceJoker(),
    createPhotographJoker(),
    createFibonacciJoker(),
    createScholarJoker(),
    createWalkieTalkieJoker(),
    createBannerJoker(),
    createMysticSummitJoker(),
    createBullJoker(),
    createBaronJoker(),
    createShootTheMoonJoker(),
    createRaisedFistJoker(),
    createAbstractJoker(),
    createBootstrapsJoker(),
    createBlackboardJoker(),
    createBloodstoneJoker(),
    createSwashbucklerJoker(),
    createReservedParkingJoker(),
    createAcrobatJoker(),
    createArrowheadJoker(),
    createOnyxAgateJoker(),
    createRoughGemJoker(),
    createGoldenJoker(),
    createDelayedGratificationJoker(),
    createCloud9Joker(),
    createStoneJoker(),
    createSteelJoker(),
    createDriversLicenseJoker(),
    createFacelessJoker(),
    createTradingCardJoker(),
  ];
}

export function isFaceCard(card: Card): boolean {
  return FACE_RANKS.has(card.rank);
}

function assertNeverEffect(effect: never): never {
  throw new Error(
    `Unhandled joker effect: ${JSON.stringify(effect)}`,
  );
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
}

export function applyHandLevelJokers(
  jokers: ReadonlyArray<Joker>,
  context: HandLevelContext = {},
): JokerHandResult {
  let additiveMult = 0;
  let additiveChips = 0;
  let xMult = 1;
  let moneyEarned = 0;
  const fired: string[] = [];
  const steps: JokerHandLevelStep[] = [];

  for (let i = 0; i < jokers.length; i += 1) {
    const joker = jokers[i];
    const effect = joker.effect;
    switch (effect.kind) {
      case "additive-mult": {
        additiveMult += effect.amount;
        fired.push(joker.id);
        steps.push({ jokerId: joker.id, jokerName: joker.name, additiveMult: effect.amount });
        break;
      }
      case "on-hand-type-mult": {
        if (
          context.playedHandLabel !== undefined &&
          handContains(context.playedHandLabel, effect.requires)
        ) {
          additiveMult += effect.amount;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveMult: effect.amount });
        }
        break;
      }
      case "on-hand-type-chips": {
        if (
          context.playedHandLabel !== undefined &&
          handContains(context.playedHandLabel, effect.requires)
        ) {
          additiveChips += effect.amount;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveChips: effect.amount });
        }
        break;
      }
      case "on-hand-type-x-mult": {
        if (
          context.playedHandLabel !== undefined &&
          handContains(context.playedHandLabel, effect.requires)
        ) {
          xMult *= effect.amount;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, xMultFactor: effect.amount });
        }
        break;
      }
      case "additive-mult-when-hand-size": {
        if (
          context.playedCardCount !== undefined &&
          context.playedCardCount <= effect.maxCardsPlayed
        ) {
          additiveMult += effect.amount;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveMult: effect.amount });
        }
        break;
      }
      case "additive-mult-random": {
        const rng = context.rng ?? Math.random;
        const span = effect.max - effect.min + 1;
        const rolled = Math.floor(rng() * span) + effect.min;
        additiveMult += rolled;
        fired.push(joker.id);
        steps.push({ jokerId: joker.id, jokerName: joker.name, additiveMult: rolled });
        break;
      }
      case "stencil": {
        const emptySlots = MAX_JOKERS - effectiveJokerCount(jokers);
        if (emptySlots > 0) {
          xMult *= emptySlots;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, xMultFactor: emptySlots });
        }
        break;
      }
      case "per-remaining-discard-chips": {
        const discards = context.remainingDiscards ?? 0;
        const chips = effect.amount * discards;
        if (chips > 0) {
          additiveChips += chips;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveChips: chips });
        }
        break;
      }
      case "mult-when-no-discards": {
        if (context.remainingDiscards === 0) {
          additiveMult += effect.amount;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveMult: effect.amount });
        }
        break;
      }
      case "per-dollar-chips": {
        const money = Math.max(0, context.money ?? 0);
        const chips = effect.amount * money;
        if (chips > 0) {
          additiveChips += chips;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveChips: chips });
        }
        break;
      }
      case "per-held-rank": {
        const held = context.heldInHandCards ?? [];
        let matched = 0;
        for (const card of held) {
          if (effect.ranks.includes(card.rank)) matched += 1;
        }
        if (matched > 0) {
          fired.push(joker.id);
          if (effect.mult !== undefined) {
            const total = effect.mult * matched;
            additiveMult += total;
            steps.push({ jokerId: joker.id, jokerName: joker.name, additiveMult: total });
          }
          if (effect.xMult !== undefined) {
            const factor = effect.xMult ** matched;
            xMult *= factor;
            steps.push({ jokerId: joker.id, jokerName: joker.name, xMultFactor: factor });
          }
        }
        break;
      }
      case "held-lowest-rank-mult": {
        const held = context.heldInHandCards ?? [];
        if (held.length > 0) {
          let lowest = getRankChips(held[0].rank);
          for (let h = 1; h < held.length; h += 1) {
            const value = getRankChips(held[h].rank);
            if (value < lowest) lowest = value;
          }
          const bonus = effect.multiplier * lowest;
          additiveMult += bonus;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveMult: bonus });
        }
        break;
      }
      case "per-joker-count-mult": {
        const bonus = effect.amount * jokers.length;
        if (bonus > 0) {
          additiveMult += bonus;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveMult: bonus });
        }
        break;
      }
      case "per-money-bucket-mult": {
        const money = Math.max(0, context.money ?? 0);
        const buckets = Math.floor(money / effect.bucket);
        const bonus = effect.amount * buckets;
        if (bonus > 0) {
          additiveMult += bonus;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveMult: bonus });
        }
        break;
      }
      case "x-mult-when-held-suits-all-in": {
        const held = context.heldInHandCards ?? [];
        const allMatch = held.every((c) => effect.suits.includes(c.suit));
        if (allMatch) {
          xMult *= effect.amount;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, xMultFactor: effect.amount });
        }
        break;
      }
      case "other-jokers-sell-value-mult": {
        let total = 0;
        for (let k = 0; k < jokers.length; k += 1) {
          if (k !== i) total += jokerSellValue(jokers[k]);
        }
        if (total > 0) {
          additiveMult += total;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveMult: total });
        }
        break;
      }
      case "per-held-face-chance-money": {
        const held = context.heldInHandCards ?? [];
        const rng = context.rng ?? Math.random;
        let earned = 0;
        for (const c of held) {
          if (isFaceCard(c) && rollChance(effect.chance, rng)) {
            earned += effect.payout;
          }
        }
        if (earned > 0) {
          moneyEarned += earned;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, moneyEarned: earned });
        }
        break;
      }
      case "x-mult-on-final-hand": {
        if (context.remainingHands === 1) {
          xMult *= effect.amount;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, xMultFactor: effect.amount });
        }
        break;
      }
      case "per-enhanced-in-deck-chips": {
        const deck = context.fullDeck ?? [];
        let matches = 0;
        for (const c of deck) if (c.enhancement === effect.enhancement) matches += 1;
        const chips = effect.amount * matches;
        if (chips > 0) {
          additiveChips += chips;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveChips: chips });
        }
        break;
      }
      case "per-enhanced-in-deck-x-mult": {
        const deck = context.fullDeck ?? [];
        let matches = 0;
        for (const c of deck) if (c.enhancement === effect.enhancement) matches += 1;
        if (matches > 0) {
          const factor = 1 + effect.amount * matches;
          xMult *= factor;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, xMultFactor: factor });
        }
        break;
      }
      case "x-mult-when-enhanced-count-at-least": {
        const deck = context.fullDeck ?? [];
        let enhancedCount = 0;
        for (const c of deck) if (c.enhancement !== undefined) enhancedCount += 1;
        if (enhancedCount >= effect.threshold) {
          xMult *= effect.amount;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, xMultFactor: effect.amount });
        }
        break;
      }
      case "business-card":
      case "per-suit-mult":
      case "per-scored-rank-parity":
      case "per-scored-face":
      case "x-mult-on-face-scored":
      case "per-scored-rank":
      case "per-suit-chance-x-mult":
      case "per-scored-rank-x-mult":
      case "per-suit-chips":
      case "per-suit-money":
      case "end-of-round-money":
      case "per-remaining-discard-end-of-round-money":
      case "per-rank-in-deck-end-of-round-money":
      case "on-discard-money-when-face-count-at-least":
      case "on-first-discard-of-round-money-when-size":
        break;
      default:
        assertNeverEffect(effect);
    }
    if (joker.edition !== undefined && joker.edition !== "negative") {
      switch (joker.edition) {
        case "foil": {
          additiveChips += FOIL_CHIPS;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveChips: FOIL_CHIPS });
          break;
        }
        case "holographic": {
          additiveMult += HOLOGRAPHIC_MULT;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, additiveMult: HOLOGRAPHIC_MULT });
          break;
        }
        case "polychrome": {
          xMult *= POLYCHROME_X_MULT;
          fired.push(joker.id);
          steps.push({ jokerId: joker.id, jokerName: joker.name, xMultFactor: POLYCHROME_X_MULT });
          break;
        }
      }
    }
  }

  return { additiveMult, additiveChips, xMult, moneyEarned, firedJokerIds: fired, steps };
}

export function applyPerCardJokers(
  jokers: ReadonlyArray<Joker>,
  card: Card,
  rng: RandomSource = Math.random,
  context: PerCardContext = {},
): JokerCardResult {
  let moneyEarned = 0;
  let additiveMult = 0;
  let additiveChips = 0;
  let xMult = 1;
  const fired: string[] = [];
  const steps: JokerCardStep[] = [];

  for (let i = 0; i < jokers.length; i += 1) {
    const joker = jokers[i];
    const effect = joker.effect;
    switch (effect.kind) {
      case "business-card": {
        if (isFaceCard(card) && rollChance(effect.chance, rng)) {
          moneyEarned += effect.payout;
          fired.push(joker.id);
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            moneyEarned: effect.payout,
          });
        }
        break;
      }
      case "per-suit-mult": {
        if (card.suit === effect.suit) {
          additiveMult += effect.amount;
          fired.push(joker.id);
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            additiveMult: effect.amount,
          });
        }
        break;
      }
      case "per-suit-chance-x-mult": {
        if (card.suit === effect.suit && rollChance(effect.chance, rng)) {
          xMult *= effect.amount;
          fired.push(joker.id);
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            xMultFactor: effect.amount,
          });
        }
        break;
      }
      case "per-suit-chips": {
        if (card.suit === effect.suit) {
          additiveChips += effect.amount;
          fired.push(joker.id);
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            additiveChips: effect.amount,
          });
        }
        break;
      }
      case "per-suit-money": {
        if (card.suit === effect.suit) {
          moneyEarned += effect.amount;
          fired.push(joker.id);
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            moneyEarned: effect.amount,
          });
        }
        break;
      }
      case "per-scored-rank-parity": {
        if (RANK_PARITY[card.rank] === effect.parity) {
          if (effect.contribution.kind === "mult") {
            additiveMult += effect.contribution.amount;
            steps.push({
              jokerId: joker.id,
              jokerName: joker.name,
              additiveMult: effect.contribution.amount,
            });
          } else {
            additiveChips += effect.contribution.amount;
            steps.push({
              jokerId: joker.id,
              jokerName: joker.name,
              additiveChips: effect.contribution.amount,
            });
          }
          fired.push(joker.id);
        }
        break;
      }
      case "per-scored-face": {
        if (isFaceCard(card)) {
          if (effect.contribution.kind === "mult") {
            additiveMult += effect.contribution.amount;
            steps.push({
              jokerId: joker.id,
              jokerName: joker.name,
              additiveMult: effect.contribution.amount,
            });
          } else {
            additiveChips += effect.contribution.amount;
            steps.push({
              jokerId: joker.id,
              jokerName: joker.name,
              additiveChips: effect.contribution.amount,
            });
          }
          fired.push(joker.id);
        }
        break;
      }
      case "x-mult-on-face-scored": {
        if (isFaceCard(card) && !context.firstFaceAlreadyScored) {
          xMult *= effect.amount;
          fired.push(joker.id);
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            xMultFactor: effect.amount,
          });
        }
        break;
      }
      case "per-scored-rank": {
        if (effect.ranks.includes(card.rank)) {
          if (effect.mult !== undefined) additiveMult += effect.mult;
          if (effect.chips !== undefined) additiveChips += effect.chips;
          fired.push(joker.id);
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            ...(effect.mult !== undefined ? { additiveMult: effect.mult } : {}),
            ...(effect.chips !== undefined ? { additiveChips: effect.chips } : {}),
          });
        }
        break;
      }
      case "per-scored-rank-x-mult": {
        if (effect.ranks.includes(card.rank)) {
          xMult *= effect.amount;
          fired.push(joker.id);
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            xMultFactor: effect.amount,
          });
        }
        break;
      }
      case "additive-mult":
      case "stencil":
      case "on-hand-type-mult":
      case "on-hand-type-chips":
      case "on-hand-type-x-mult":
      case "additive-mult-when-hand-size":
      case "additive-mult-random":
      case "per-remaining-discard-chips":
      case "mult-when-no-discards":
      case "per-dollar-chips":
      case "per-held-rank":
      case "held-lowest-rank-mult":
      case "per-joker-count-mult":
      case "per-money-bucket-mult":
      case "x-mult-when-held-suits-all-in":
      case "other-jokers-sell-value-mult":
      case "per-held-face-chance-money":
      case "x-mult-on-final-hand":
      case "end-of-round-money":
      case "per-remaining-discard-end-of-round-money":
      case "per-rank-in-deck-end-of-round-money":
      case "per-enhanced-in-deck-chips":
      case "per-enhanced-in-deck-x-mult":
      case "x-mult-when-enhanced-count-at-least":
      case "on-discard-money-when-face-count-at-least":
      case "on-first-discard-of-round-money-when-size":
        break;
      default:
        assertNeverEffect(effect);
    }
  }

  return {
    moneyEarned,
    additiveMult,
    additiveChips,
    xMult,
    firedJokerIds: fired,
    steps,
  };
}

export function applyJokersToScoring(
  jokers: ReadonlyArray<Joker>,
  scoredCards: ReadonlyArray<Card>,
  rng: RandomSource = Math.random,
  context: HandLevelContext = {},
): JokerScoringResult {
  const handResult = applyHandLevelJokers(jokers, {
    ...context,
    scoredCards: context.scoredCards ?? scoredCards,
  });
  let moneyEarned = handResult.moneyEarned;
  let perCardAdditiveMult = 0;
  let perCardAdditiveChips = 0;
  let perCardXMult = 1;
  let firstFaceAlreadyScored = false;
  for (let c = 0; c < scoredCards.length; c += 1) {
    const cardResult = applyPerCardJokers(jokers, scoredCards[c], rng, {
      firstFaceAlreadyScored,
    });
    moneyEarned += cardResult.moneyEarned;
    perCardAdditiveMult += cardResult.additiveMult;
    perCardAdditiveChips += cardResult.additiveChips;
    perCardXMult *= cardResult.xMult;
    if (isFaceCard(scoredCards[c])) firstFaceAlreadyScored = true;
  }
  return {
    additiveMult: handResult.additiveMult + perCardAdditiveMult,
    additiveChips: handResult.additiveChips + perCardAdditiveChips,
    xMult: handResult.xMult * perCardXMult,
    moneyEarned,
  };
}

export interface EndOfRoundContext {
  readonly remainingDiscards?: number;
  readonly discardsUsedThisRound?: number;
  readonly fullDeck?: ReadonlyArray<Card>;
}

export interface EndOfRoundStep {
  readonly jokerId: string;
  readonly jokerName: string;
  readonly moneyEarned: number;
}

export interface EndOfRoundResult {
  readonly moneyEarned: number;
  readonly steps: ReadonlyArray<EndOfRoundStep>;
}

export function applyEndOfRoundJokers(
  jokers: ReadonlyArray<Joker>,
  context: EndOfRoundContext = {},
): EndOfRoundResult {
  let moneyEarned = 0;
  const steps: EndOfRoundStep[] = [];
  for (const joker of jokers) {
    const effect = joker.effect;
    if (effect.kind === "end-of-round-money") {
      if (effect.amount > 0) {
        moneyEarned += effect.amount;
        steps.push({
          jokerId: joker.id,
          jokerName: joker.name,
          moneyEarned: effect.amount,
        });
      }
    } else if (effect.kind === "per-remaining-discard-end-of-round-money") {
      const used = context.discardsUsedThisRound ?? 0;
      if (used === 0) {
        const discards = Math.max(0, context.remainingDiscards ?? 0);
        const earned = effect.amount * discards;
        if (earned > 0) {
          moneyEarned += earned;
          steps.push({
            jokerId: joker.id,
            jokerName: joker.name,
            moneyEarned: earned,
          });
        }
      }
    } else if (effect.kind === "per-rank-in-deck-end-of-round-money") {
      const deck = context.fullDeck ?? [];
      let matches = 0;
      for (const c of deck) {
        if (effect.ranks.includes(c.rank)) matches += 1;
      }
      const earned = effect.amount * matches;
      if (earned > 0) {
        moneyEarned += earned;
        steps.push({
          jokerId: joker.id,
          jokerName: joker.name,
          moneyEarned: earned,
        });
      }
    }
  }
  return { moneyEarned, steps };
}

export interface OnDiscardContext {
  readonly discardsUsedThisRound?: number;
}

export interface OnDiscardStep {
  readonly jokerId: string;
  readonly jokerName: string;
  readonly moneyEarned: number;
  readonly destroyedCardId?: number;
}

export interface OnDiscardResult {
  readonly moneyEarned: number;
  readonly steps: ReadonlyArray<OnDiscardStep>;
}

export function applyOnDiscardJokers(
  jokers: ReadonlyArray<Joker>,
  discardedCards: ReadonlyArray<Card>,
  context: OnDiscardContext = {},
): OnDiscardResult {
  let moneyEarned = 0;
  const steps: OnDiscardStep[] = [];
  for (const joker of jokers) {
    const effect = joker.effect;
    if (effect.kind === "on-discard-money-when-face-count-at-least") {
      let faceCount = 0;
      for (const c of discardedCards) if (isFaceCard(c)) faceCount += 1;
      if (faceCount >= effect.threshold) {
        moneyEarned += effect.payout;
        steps.push({
          jokerId: joker.id,
          jokerName: joker.name,
          moneyEarned: effect.payout,
        });
      }
    } else if (effect.kind === "on-first-discard-of-round-money-when-size") {
      const isFirst = (context.discardsUsedThisRound ?? 0) === 1;
      if (isFirst && discardedCards.length === effect.size) {
        moneyEarned += effect.payout;
        steps.push({
          jokerId: joker.id,
          jokerName: joker.name,
          moneyEarned: effect.payout,
          destroyedCardId: discardedCards[0].id,
        });
      }
    }
  }
  return { moneyEarned, steps };
}

export function computeFinalScoreWithJokers(
  baseHandChips: number,
  baseHandMultiplier: number,
  cardChipsTotal: number,
  jokerResult: JokerScoringResult,
): number {
  const chipsTotal = baseHandChips + cardChipsTotal + jokerResult.additiveChips;
  const mult = (baseHandMultiplier + jokerResult.additiveMult) * jokerResult.xMult;
  return Math.floor(chipsTotal * mult);
}
