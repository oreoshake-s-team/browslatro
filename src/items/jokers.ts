import type { Card, Rank, Suit } from "../cards/types";
import { rollChance } from "../dev/chanceOverride";
import { type HandLabel, handContains } from "../scoring/handEvaluator";
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

export function replaceJokersExceptCopyOf(
  jokers: ReadonlyArray<Joker>,
  idx: number,
): Joker[] {
  if (idx < 0 || idx >= jokers.length) return [...jokers];
  return [cloneJoker(jokers[idx])];
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
}

export interface JokerHandResult {
  readonly additiveMult: number;
  readonly additiveChips: number;
  readonly xMult: number;
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

export const initialJokersConfig: { factory: () => Joker[] } = {
  factory: () => [],
};

export function createLegendaryJokerCatalog(): Joker[] {
  return [createYorickJoker()];
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
    createEvenStevenJoker(),
    createOddToddJoker(),
    createHalfJoker(),
    createMisprintJoker(),
    createScaryFaceJoker(),
    createSmileyFaceJoker(),
    createPhotographJoker(),
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
  readonly rng?: RandomSource;
}

export function applyHandLevelJokers(
  jokers: ReadonlyArray<Joker>,
  context: HandLevelContext = {},
): JokerHandResult {
  let additiveMult = 0;
  let additiveChips = 0;
  let xMult = 1;
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
      case "business-card":
      case "per-suit-mult":
      case "per-scored-rank-parity":
      case "per-scored-face":
      case "x-mult-on-face-scored":
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

  return { additiveMult, additiveChips, xMult, firedJokerIds: fired, steps };
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
      case "additive-mult":
      case "stencil":
      case "on-hand-type-mult":
      case "on-hand-type-chips":
      case "additive-mult-when-hand-size":
      case "additive-mult-random":
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
  let moneyEarned = 0;
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
