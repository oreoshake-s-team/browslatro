import {
  ABSTRACT_JOKER_MULT_PER_JOKER,
  ACROBAT_X_MULT,
  ARROWHEAD_CHIPS,
  BANNER_CHIPS_PER_DISCARD,
  BARON_RANKS,
  BARON_X_MULT,
  BLACKBOARD_SUITS,
  BLACKBOARD_X_MULT,
  BLOODSTONE_CHANCE,
  BLOODSTONE_X_MULT,
  BOOTSTRAPS_BUCKET_DOLLARS,
  BOOTSTRAPS_MULT_PER_BUCKET,
  BULL_CHIPS_PER_DOLLAR,
  BURGLAR_DISCARDS_OVERRIDE,
  BURGLAR_HANDS,
  BUSINESS_CARD_PROC_CHANCE,
  CLEVER_JOKER_CHIPS,
  CLOUD_9_MONEY_PER_NINE,
  CLOUD_9_RANKS,
  CRAFTY_JOKER_CHIPS,
  CRAZY_JOKER_MULT,
  CREDIT_CARD_DEBT_FLOOR,
  BASEBALL_CARD_X_MULT_PER_UNCOMMON,
  BLUE_JOKER_CHIPS_PER_REMAINING_CARD,
  DELAYED_GRATIFICATION_MONEY_PER_DISCARD,
  DEVIOUS_JOKER_CHIPS,
  DRIVERS_LICENSE_ENHANCED_THRESHOLD,
  DRIVERS_LICENSE_X_MULT,
  DROLL_JOKER_MULT,
  DRUNKARD_DISCARDS_BONUS,
  EROSION_MULT_PER_MISSING_CARD,
  EVEN_STEVEN_MULT,
  FACELESS_JOKER_FACE_THRESHOLD,
  FACELESS_JOKER_PAYOUT,
  FIBONACCI_MULT,
  FIBONACCI_RANKS,
  FLOWER_POT_X_MULT,
  GOLDEN_JOKER_MONEY,
  HALF_JOKER_MAX_CARDS,
  HALF_JOKER_MULT,
  JOLLY_JOKER_MULT,
  JUGGLER_HAND_SIZE_BONUS,
  MAD_JOKER_MULT,
  MERRY_ANDY_DISCARDS,
  MERRY_ANDY_HAND_SIZE,
  MISPRINT_MAX_MULT,
  MISPRINT_MIN_MULT,
  MYSTIC_SUMMIT_MULT,
  ODD_TODD_CHIPS,
  ONYX_AGATE_MULT,
  PHOTOGRAPH_X_MULT,
  RAISED_FIST_MULTIPLIER,
  RESERVED_PARKING_CHANCE,
  RESERVED_PARKING_PAYOUT,
  ROUGH_GEM_MONEY,
  SCARY_FACE_CHIPS,
  SCHOLAR_CHIPS,
  SCHOLAR_MULT,
  SCHOLAR_RANKS,
  SEEING_DOUBLE_X_MULT,
  SHOOT_THE_MOON_MULT,
  SHOOT_THE_MOON_RANKS,
  SLY_JOKER_CHIPS,
  SMILEY_FACE_MULT,
  LOYALTY_CARD_HANDS_PER_TRIGGER,
  LOYALTY_CARD_X_MULT,
  GREEN_JOKER_MULT_PER_HAND,
  GREEN_JOKER_MULT_PER_DISCARD,
  CARD_SHARP_X_MULT,
  THROWBACK_X_MULT_PER_SKIP,
  HOLOGRAM_X_MULT_PER_ADDED_CARD,
  FLASH_CARD_MULT_PER_REROLL,
  ICE_CREAM_CHIPS,
  ICE_CREAM_CHIPS_LOSS_PER_HAND,
  POPCORN_MULT,
  POPCORN_MULT_LOSS_PER_ROUND,
  RAMEN_X_MULT,
  RAMEN_X_MULT_LOSS_PER_CARD,
  GROS_MICHEL_MULT,
  GROS_MICHEL_BUST_CHANCE,
  HACK_RANKS,
  HACK_RETRIGGERS,
  DUSK_RETRIGGERS,
  SOCK_AND_BUSKIN_RETRIGGERS,
  HANGING_CHAD_RETRIGGERS,
  RED_CARD_MULT_PER_SKIPPED_PACK,
  HIT_THE_ROAD_X_MULT_PER_JACK,
  LUCKY_CAT_X_MULT_PER_TRIGGER,
  EGG_SELL_VALUE_PER_ROUND,
  FORTUNE_TELLER_MULT_PER_TAROT,
  CONSTELLATION_X_MULT_PER_PLANET,
  CAMPFIRE_X_MULT_PER_SOLD_CARD,
  OBELISK_X_MULT_PER_CONSECUTIVE_HAND,
  ROCKET_BASE_PAYOUT,
  ROCKET_PAYOUT_GROWTH_PER_BOSS,
  TURTLE_BEAN_HAND_SIZE,
  TURTLE_BEAN_LOSS_PER_ROUND,
  SELTZER_HANDS,
  SELTZER_RETRIGGERS,
  MIME_HELD_RETRIGGERS,
  VAMPIRE_X_MULT_PER_ENHANCED,
  RIDE_THE_BUS_MULT_PER_FACELESS_HAND,
  RUNNER_CHIPS_PER_STRAIGHT,
  SPARE_TROUSERS_MULT_PER_TWO_PAIR,
  SQUARE_JOKER_CARD_COUNT,
  SQUARE_JOKER_CHIPS_PER_FOUR_CARD,
  STEEL_JOKER_X_MULT_PER_STEEL,
  STONE_JOKER_CHIPS_PER_STONE,
  STUNTMAN_CHIPS,
  STUNTMAN_HAND_SIZE,
  SUIT_MULT_AMOUNT,
  THE_DUO_X_MULT,
  THE_FAMILY_X_MULT,
  THE_ORDER_X_MULT,
  THE_TRIBE_X_MULT,
  THE_TRIO_X_MULT,
  TRADING_CARD_DISCARD_SIZE,
  TRADING_CARD_PAYOUT,
  TRIBOULET_RANKS,
  TRIBOULET_X_MULT,
  TROUBADOUR_HAND_SIZE,
  TROUBADOUR_HANDS,
  WALKIE_TALKIE_CHIPS,
  WALKIE_TALKIE_MULT,
  WALKIE_TALKIE_RANKS,
  WEE_JOKER_CHIPS_PER_TWO,
  WILY_JOKER_CHIPS,
  ZANY_JOKER_MULT,
} from "./constants";
import type { Joker } from "./types";

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
    requiresEnhancementInDeck: "stone",
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
    requiresEnhancementInDeck: "steel",
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

export function createErosionJoker(): Joker {
  return {
    id: "erosion",
    rarity: "uncommon",
    name: "Erosion",
    description: `+${EROSION_MULT_PER_MISSING_CARD} Mult for each card below your deck's starting size`,
    effect: {
      kind: "per-missing-card-mult",
      amount: EROSION_MULT_PER_MISSING_CARD,
    },
  };
}

export function createBlueJoker(): Joker {
  return {
    id: "blue-joker",
    rarity: "common",
    name: "Blue Joker",
    description: `+${BLUE_JOKER_CHIPS_PER_REMAINING_CARD} Chips for each remaining card in your deck`,
    effect: {
      kind: "per-remaining-deck-card-chips",
      amount: BLUE_JOKER_CHIPS_PER_REMAINING_CARD,
    },
  };
}

export function createBaseballCardJoker(): Joker {
  return {
    id: "baseball-card",
    rarity: "rare",
    name: "Baseball Card",
    description: `Each other Uncommon Joker gives X${1 + BASEBALL_CARD_X_MULT_PER_UNCOMMON} Mult`,
    effect: {
      kind: "x-mult-per-uncommon-joker",
      amount: BASEBALL_CARD_X_MULT_PER_UNCOMMON,
    },
  };
}

export function createFlowerPotJoker(): Joker {
  return {
    id: "flower-pot",
    rarity: "uncommon",
    name: "Flower Pot",
    description: `X${FLOWER_POT_X_MULT} Mult if scored hand contains a card of each suit`,
    effect: { kind: "all-suits-x-mult", amount: FLOWER_POT_X_MULT },
  };
}

export function createSeeingDoubleJoker(): Joker {
  return {
    id: "seeing-double",
    rarity: "uncommon",
    name: "Seeing Double",
    description: `X${SEEING_DOUBLE_X_MULT} Mult if scored hand has a Club card and a card of any other suit`,
    effect: {
      kind: "x-mult-when-clubs-and-other-suit",
      amount: SEEING_DOUBLE_X_MULT,
    },
  };
}

export function createJugglerJoker(): Joker {
  return {
    id: "juggler",
    rarity: "common",
    name: "Juggler",
    description: `+${JUGGLER_HAND_SIZE_BONUS} hand size`,
    effect: { kind: "passive-run-stats", handSize: JUGGLER_HAND_SIZE_BONUS },
  };
}

export function createDrunkardJoker(): Joker {
  return {
    id: "drunkard",
    rarity: "common",
    name: "Drunkard",
    description: `+${DRUNKARD_DISCARDS_BONUS} discard each round`,
    effect: {
      kind: "passive-run-stats",
      discards: DRUNKARD_DISCARDS_BONUS,
    },
  };
}

export function createMerryAndyJoker(): Joker {
  return {
    id: "merry-andy",
    rarity: "uncommon",
    name: "Merry Andy",
    description: `+${MERRY_ANDY_DISCARDS} discards each round, -${Math.abs(MERRY_ANDY_HAND_SIZE)} hand size`,
    effect: {
      kind: "passive-run-stats",
      discards: MERRY_ANDY_DISCARDS,
      handSize: MERRY_ANDY_HAND_SIZE,
    },
  };
}

export function createTroubadourJoker(): Joker {
  return {
    id: "troubadour",
    rarity: "uncommon",
    name: "Troubadour",
    description: `+${TROUBADOUR_HAND_SIZE} hand size, -${Math.abs(TROUBADOUR_HANDS)} hand each round`,
    effect: {
      kind: "passive-run-stats",
      handSize: TROUBADOUR_HAND_SIZE,
      hands: TROUBADOUR_HANDS,
    },
  };
}

export function createStuntmanJoker(): Joker {
  return {
    id: "stuntman",
    rarity: "rare",
    name: "Stuntman",
    description: `+${STUNTMAN_CHIPS} Chips, -${Math.abs(STUNTMAN_HAND_SIZE)} hand size`,
    effect: {
      kind: "passive-run-stats",
      handSize: STUNTMAN_HAND_SIZE,
      additiveChips: STUNTMAN_CHIPS,
    },
  };
}

export function createCreditCardJoker(): Joker {
  return {
    id: "credit-card",
    rarity: "common",
    name: "Credit Card",
    description: `Your money can go as low as -\$${CREDIT_CARD_DEBT_FLOOR}`,
    effect: { kind: "passive-run-stats", debtFloor: CREDIT_CARD_DEBT_FLOOR },
  };
}

export function createBurglarJoker(): Joker {
  return {
    id: "burglar",
    rarity: "uncommon",
    name: "Burglar",
    description: `+${BURGLAR_HANDS} hands per round, lose all discards`,
    effect: {
      kind: "passive-run-stats",
      hands: BURGLAR_HANDS,
      discardsOverride: BURGLAR_DISCARDS_OVERRIDE,
    },
  };
}

export function createSupernovaJoker(): Joker {
  return {
    id: "supernova",
    rarity: "common",
    name: "Supernova",
    description:
      "Adds the number of times your played hand has been played this run to Mult",
    effect: { kind: "per-hand-play-count-mult" },
  };
}

export function createSpareTrousersJoker(): Joker {
  return {
    id: "spare-trousers",
    rarity: "uncommon",
    name: "Spare Trousers",
    description: `This Joker gains +${SPARE_TROUSERS_MULT_PER_TWO_PAIR} Mult if played hand contains a Two Pair`,
    effect: {
      kind: "on-hand-type-stack-mult",
      requires: "Two Pair",
      amount: SPARE_TROUSERS_MULT_PER_TWO_PAIR,
    },
    state: { kind: "counter", value: 0 },
  };
}

export function createRunnerJoker(): Joker {
  return {
    id: "runner",
    rarity: "common",
    name: "Runner",
    description: `This Joker gains +${RUNNER_CHIPS_PER_STRAIGHT} Chips if played hand contains a Straight`,
    effect: {
      kind: "on-hand-type-stack-chips",
      requires: "Straight",
      amount: RUNNER_CHIPS_PER_STRAIGHT,
    },
    state: { kind: "counter", value: 0 },
  };
}

export function createSquareJokerJoker(): Joker {
  return {
    id: "square-joker",
    rarity: "common",
    name: "Square Joker",
    description: `This Joker gains +${SQUARE_JOKER_CHIPS_PER_FOUR_CARD} Chips if played hand has exactly ${SQUARE_JOKER_CARD_COUNT} cards`,
    effect: {
      kind: "on-played-card-count-stack-chips",
      count: SQUARE_JOKER_CARD_COUNT,
      amount: SQUARE_JOKER_CHIPS_PER_FOUR_CARD,
    },
    state: { kind: "counter", value: 0 },
  };
}

export function createWeeJokerJoker(): Joker {
  return {
    id: "wee-joker",
    rarity: "rare",
    name: "Wee Joker",
    description: `This Joker gains +${WEE_JOKER_CHIPS_PER_TWO} Chips per played 2`,
    effect: {
      kind: "on-played-rank-stack-chips",
      ranks: ["2"],
      amount: WEE_JOKER_CHIPS_PER_TWO,
    },
    state: { kind: "counter", value: 0 },
  };
}

export function createRideTheBusJoker(): Joker {
  return {
    id: "ride-the-bus",
    rarity: "common",
    name: "Ride the Bus",
    description: `This Joker gains +${RIDE_THE_BUS_MULT_PER_FACELESS_HAND} Mult per consecutive hand played without a scored face card`,
    effect: {
      kind: "on-no-face-stack-mult",
      amount: RIDE_THE_BUS_MULT_PER_FACELESS_HAND,
    },
    state: { kind: "counter", value: 0 },
  };
}

export function createLoyaltyCardJoker(): Joker {
  return {
    id: "loyalty-card",
    rarity: "uncommon",
    name: "Loyalty Card",
    description: `X${LOYALTY_CARD_X_MULT} Mult every ${LOYALTY_CARD_HANDS_PER_TRIGGER} hands played`,
    effect: {
      kind: "every-n-hands-xmult",
      n: LOYALTY_CARD_HANDS_PER_TRIGGER,
      xmult: LOYALTY_CARD_X_MULT,
    },
    state: { kind: "counter", value: 0 },
  };
}

export function createPareidoliaJoker(): Joker {
  return {
    id: "pareidolia",
    rarity: "uncommon",
    name: "Pareidolia",
    description: "All cards are considered face cards",
    effect: { kind: "passive-run-stats", allCardsFace: true },
  };
}

export function createSplashJoker(): Joker {
  return {
    id: "splash",
    rarity: "uncommon",
    name: "Splash",
    description: "Every played card counts in scoring",
    effect: { kind: "passive-run-stats", allCardsScore: true },
  };
}

export function createAstronomerJoker(): Joker {
  return {
    id: "astronomer",
    rarity: "uncommon",
    name: "Astronomer",
    description: "All Celestial Packs and Planet cards in the shop are free",
    effect: { kind: "passive-run-stats", astronomer: true },
  };
}

export function createChaosTheClownJoker(): Joker {
  return {
    id: "chaos-the-clown",
    rarity: "common",
    name: "Chaos the Clown",
    description: "1 free Reroll per shop",
    effect: { kind: "passive-run-stats", chaosTheClown: true },
  };
}

export function createFourFingersJoker(): Joker {
  return {
    id: "four-fingers",
    rarity: "common",
    name: "Four Fingers",
    description: "All Flushes and Straights can be made with 4 cards",
    effect: { kind: "passive-run-stats", fourFingers: true },
  };
}

export function createShortcutJoker(): Joker {
  return {
    id: "shortcut",
    rarity: "uncommon",
    name: "Shortcut",
    description: "Allows Straights to be made of cards that are 1 rank apart",
    effect: { kind: "passive-run-stats", shortcut: true },
  };
}

export function createSmearedJoker(): Joker {
  return {
    id: "smeared",
    rarity: "uncommon",
    name: "Smeared Joker",
    description:
      "Hearts and Diamonds count as the same suit. Spades and Clubs count as the same suit.",
    effect: { kind: "passive-run-stats", smearedSuits: true },
  };
}

export const OOPS_ALL_SIXES_PROBABILITY_MULTIPLIER = 2;

export function createOopsAllSixesJoker(): Joker {
  return {
    id: "oops-all-6s",
    rarity: "uncommon",
    name: "Oops! All 6s",
    description: "Doubles all listed probabilities (e.g. 1 in 3 becomes 2 in 3)",
    effect: {
      kind: "passive-run-stats",
      probabilityMultiplier: OOPS_ALL_SIXES_PROBABILITY_MULTIPLIER,
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

export function createGreenJokerJoker(): Joker {
  return {
    id: "green-joker",
    rarity: "common",
    name: "Green Joker",
    description: `+${GREEN_JOKER_MULT_PER_HAND} Mult per hand played, -${GREEN_JOKER_MULT_PER_DISCARD} Mult per discard`,
    effect: {
      kind: "on-hand-stack-on-discard-shrink-mult",
      growAmount: GREEN_JOKER_MULT_PER_HAND,
      shrinkAmount: GREEN_JOKER_MULT_PER_DISCARD,
    },
    state: { kind: "counter", value: 0 },
  };
}

export function createCardSharpJoker(): Joker {
  return {
    id: "card-sharp",
    rarity: "uncommon",
    name: "Card Sharp",
    description: `X${CARD_SHARP_X_MULT} Mult if played poker hand has already been played this round`,
    effect: {
      kind: "x-mult-on-repeat-hand-this-round",
      amount: CARD_SHARP_X_MULT,
    },
  };
}

export function createThrowbackJoker(): Joker {
  return {
    id: "throwback",
    rarity: "uncommon",
    name: "Throwback",
    description: `X${THROWBACK_X_MULT_PER_SKIP} Mult for each Blind skipped this run`,
    effect: {
      kind: "x-mult-per-blind-skipped",
      amount: THROWBACK_X_MULT_PER_SKIP,
    },
  };
}

export function createHologramJoker(): Joker {
  return {
    id: "hologram",
    rarity: "uncommon",
    name: "Hologram",
    description: `This Joker gains X${HOLOGRAM_X_MULT_PER_ADDED_CARD} Mult every time a playing card is added to your deck`,
    effect: {
      kind: "x-mult-per-added-card",
      amount: HOLOGRAM_X_MULT_PER_ADDED_CARD,
    },
  };
}

export function createFlashCardJoker(): Joker {
  return {
    id: "flash-card",
    rarity: "uncommon",
    name: "Flash Card",
    description: `This Joker gains +${FLASH_CARD_MULT_PER_REROLL} Mult per reroll in the shop`,
    effect: {
      kind: "stack-mult-on-shop-reroll",
      amount: FLASH_CARD_MULT_PER_REROLL,
    },
    state: { kind: "counter", value: 0 },
  };
}

export function createIceCreamJoker(): Joker {
  return {
    id: "ice-cream",
    rarity: "common",
    name: "Ice Cream",
    description: `+${ICE_CREAM_CHIPS} Chips, -${ICE_CREAM_CHIPS_LOSS_PER_HAND} Chips for every hand played; melts at 0`,
    effect: {
      kind: "chips-melt-per-hand",
      amount: ICE_CREAM_CHIPS,
      lossPerHand: ICE_CREAM_CHIPS_LOSS_PER_HAND,
    },
    state: { kind: "counter", value: ICE_CREAM_CHIPS },
  };
}

export function createPopcornJoker(): Joker {
  return {
    id: "popcorn",
    rarity: "common",
    name: "Popcorn",
    description: `+${POPCORN_MULT} Mult, -${POPCORN_MULT_LOSS_PER_ROUND} Mult per round played; destroyed at 0`,
    effect: {
      kind: "mult-decay-per-round",
      amount: POPCORN_MULT,
      lossPerRound: POPCORN_MULT_LOSS_PER_ROUND,
    },
    state: { kind: "counter", value: POPCORN_MULT },
  };
}

export function createRamenJoker(): Joker {
  return {
    id: "ramen",
    rarity: "uncommon",
    name: "Ramen",
    description: `X${RAMEN_X_MULT} Mult, loses X${RAMEN_X_MULT_LOSS_PER_CARD} Mult per card discarded; destroyed at X1`,
    effect: {
      kind: "x-mult-shrink-per-discarded-card",
      base: RAMEN_X_MULT,
      lossPerCard: RAMEN_X_MULT_LOSS_PER_CARD,
    },
    state: { kind: "counter", value: 0 },
  };
}

export function createGrosMichelJoker(): Joker {
  return {
    id: "gros-michel",
    rarity: "common",
    name: "Gros Michel",
    description: `+${GROS_MICHEL_MULT} Mult; 1 in 6 chance this card is destroyed at the end of round`,
    effect: {
      kind: "additive-mult-chance-bust",
      amount: GROS_MICHEL_MULT,
      bustChance: GROS_MICHEL_BUST_CHANCE,
    },
  };
}

export function createHackJoker(): Joker {
  return {
    id: "hack",
    rarity: "uncommon",
    name: "Hack",
    description: "Retrigger each played 2, 3, 4, or 5",
    effect: {
      kind: "retrigger-ranks",
      ranks: HACK_RANKS,
      times: HACK_RETRIGGERS,
    },
  };
}

export function createDuskJoker(): Joker {
  return {
    id: "dusk",
    rarity: "uncommon",
    name: "Dusk",
    description: "Retrigger all played cards in final hand of the round",
    effect: { kind: "retrigger-on-final-hand", times: DUSK_RETRIGGERS },
  };
}

export function createSockAndBuskinJoker(): Joker {
  return {
    id: "sock-and-buskin",
    rarity: "uncommon",
    name: "Sock and Buskin",
    description: "Retrigger all played face cards",
    effect: {
      kind: "retrigger-face-cards",
      times: SOCK_AND_BUSKIN_RETRIGGERS,
    },
  };
}

export function createHangingChadJoker(): Joker {
  return {
    id: "hanging-chad",
    rarity: "common",
    name: "Hanging Chad",
    description: `Retrigger first played card used in scoring ${HANGING_CHAD_RETRIGGERS} additional times`,
    effect: { kind: "retrigger-first-card", times: HANGING_CHAD_RETRIGGERS },
  };
}

export function createRedCardJoker(): Joker {
  return {
    id: "red-card",
    rarity: "common",
    name: "Red Card",
    description: `This Joker gains +${RED_CARD_MULT_PER_SKIPPED_PACK} Mult when any Booster Pack is skipped`,
    effect: {
      kind: "stack-mult-on-pack-skip",
      amount: RED_CARD_MULT_PER_SKIPPED_PACK,
    },
    state: { kind: "counter", value: 0 },
  };
}

export function createHitTheRoadJoker(): Joker {
  return {
    id: "hit-the-road",
    rarity: "rare",
    name: "Hit the Road",
    description: `This Joker gains X${HIT_THE_ROAD_X_MULT_PER_JACK} Mult for every Jack discarded this round`,
    effect: {
      kind: "x-mult-per-jack-discarded-this-round",
      amount: HIT_THE_ROAD_X_MULT_PER_JACK,
    },
    state: { kind: "counter", value: 0 },
  };
}

export function createLuckyCatJoker(): Joker {
  return {
    id: "lucky-cat",
    rarity: "uncommon",
    name: "Lucky Cat",
    description: `This Joker gains X${LUCKY_CAT_X_MULT_PER_TRIGGER} Mult every time a Lucky card successfully triggers`,
    effect: {
      kind: "x-mult-per-lucky-trigger",
      amount: LUCKY_CAT_X_MULT_PER_TRIGGER,
    },
    state: { kind: "counter", value: 0 },
  };
}

export function createEggJoker(): Joker {
  return {
    id: "egg",
    rarity: "common",
    name: "Egg",
    description: `Gains $${EGG_SELL_VALUE_PER_ROUND} of sell value at end of round`,
    effect: {
      kind: "sell-value-grows-per-round",
      amount: EGG_SELL_VALUE_PER_ROUND,
    },
    state: { kind: "counter", value: 0 },
  };
}

export function createFortuneTellerJoker(): Joker {
  return {
    id: "fortune-teller",
    rarity: "common",
    name: "Fortune Teller",
    description: `+${FORTUNE_TELLER_MULT_PER_TAROT} Mult per Tarot card used this run`,
    effect: {
      kind: "stack-mult-per-tarot-used",
      amount: FORTUNE_TELLER_MULT_PER_TAROT,
    },
    state: { kind: "counter", value: 0 },
  };
}

export function createConstellationJoker(): Joker {
  return {
    id: "constellation",
    rarity: "uncommon",
    name: "Constellation",
    description: `This Joker gains X${CONSTELLATION_X_MULT_PER_PLANET} Mult per Planet card used`,
    effect: {
      kind: "x-mult-per-planet-used",
      amount: CONSTELLATION_X_MULT_PER_PLANET,
    },
    state: { kind: "counter", value: 0 },
  };
}

export function createCampfireJoker(): Joker {
  return {
    id: "campfire",
    rarity: "rare",
    name: "Campfire",
    description: `This Joker gains X${CAMPFIRE_X_MULT_PER_SOLD_CARD} Mult for each card sold, resets when Boss Blind is defeated`,
    effect: {
      kind: "x-mult-per-sold-card",
      amount: CAMPFIRE_X_MULT_PER_SOLD_CARD,
    },
    state: { kind: "counter", value: 0 },
  };
}

export function createObeliskJoker(): Joker {
  return {
    id: "obelisk",
    rarity: "rare",
    name: "Obelisk",
    description: `X${OBELISK_X_MULT_PER_CONSECUTIVE_HAND} Mult per consecutive hand played without playing your most played poker hand`,
    effect: {
      kind: "x-mult-per-hand-without-most-played",
      amount: OBELISK_X_MULT_PER_CONSECUTIVE_HAND,
    },
    state: { kind: "counter", value: 0 },
  };
}

export function createRocketJoker(): Joker {
  return {
    id: "rocket",
    rarity: "uncommon",
    name: "Rocket",
    description: `Earn $${ROCKET_BASE_PAYOUT} at end of round. Payout increases by $${ROCKET_PAYOUT_GROWTH_PER_BOSS} when Boss Blind is defeated`,
    effect: {
      kind: "end-of-round-money-grows-on-boss",
      baseAmount: ROCKET_BASE_PAYOUT,
      growth: ROCKET_PAYOUT_GROWTH_PER_BOSS,
    },
    state: { kind: "counter", value: ROCKET_BASE_PAYOUT },
  };
}

export function createToTheMoonJoker(): Joker {
  return {
    id: "to-the-moon",
    rarity: "uncommon",
    name: "To the Moon",
    description: "Earn an extra $1 of interest for every $5 you have at end of round",
    effect: { kind: "extra-interest-per-five" },
  };
}

export function createDietColaJoker(): Joker {
  return {
    id: "diet-cola",
    rarity: "uncommon",
    name: "Diet Cola",
    description: "Sell this card to create a free Double Tag",
    effect: { kind: "sell-creates-double-tag" },
  };
}

export function createTurtleBeanJoker(): Joker {
  return {
    id: "turtle-bean",
    rarity: "uncommon",
    name: "Turtle Bean",
    description: `+${TURTLE_BEAN_HAND_SIZE} hand size, reduces by ${TURTLE_BEAN_LOSS_PER_ROUND} every round`,
    effect: {
      kind: "hand-size-decay-per-round",
      amount: TURTLE_BEAN_HAND_SIZE,
      lossPerRound: TURTLE_BEAN_LOSS_PER_ROUND,
    },
    state: { kind: "counter", value: TURTLE_BEAN_HAND_SIZE },
  };
}

export function createSeltzerJoker(): Joker {
  return {
    id: "seltzer",
    rarity: "uncommon",
    name: "Seltzer",
    description: `Retrigger all cards played for the next ${SELTZER_HANDS} hands`,
    effect: {
      kind: "retrigger-all-depleting",
      times: SELTZER_RETRIGGERS,
      hands: SELTZER_HANDS,
    },
    state: { kind: "counter", value: SELTZER_HANDS },
  };
}

export function createMimeJoker(): Joker {
  return {
    id: "mime",
    rarity: "uncommon",
    name: "Mime",
    description: "Retrigger all card held in hand abilities",
    effect: {
      kind: "retrigger-held-abilities",
      times: MIME_HELD_RETRIGGERS,
    },
  };
}

export function createMidasMaskJoker(): Joker {
  return {
    id: "midas-mask",
    rarity: "uncommon",
    name: "Midas Mask",
    description: "All played face cards become Gold cards when scored",
    effect: { kind: "played-faces-become-gold" },
  };
}

export function createVampireJoker(): Joker {
  return {
    id: "vampire",
    rarity: "rare",
    name: "Vampire",
    description: `This Joker gains X${VAMPIRE_X_MULT_PER_ENHANCED} Mult per scored Enhanced card played, removes card Enhancement`,
    effect: {
      kind: "x-mult-per-enhancement-eaten",
      amount: VAMPIRE_X_MULT_PER_ENHANCED,
    },
    state: { kind: "counter", value: 0 },
  };
}

export function createBlueprintJoker(): Joker {
  return {
    id: "blueprint",
    rarity: "rare",
    name: "Blueprint",
    description: "Copies the ability of the Joker to the right",
    effect: { kind: "copy-right-joker" },
  };
}

export function createBrainstormJoker(): Joker {
  return {
    id: "brainstorm",
    rarity: "rare",
    name: "Brainstorm",
    description: "Copies the ability of the leftmost Joker",
    effect: { kind: "copy-leftmost-joker" },
  };
}
