import type { Enhancement, Rank, Suit } from "../cards/types";
import { RANKS } from "../cards/deck";
import type { Joker, JokerEdition, RandomSource } from "./jokers";
import { JOKER_EDITION_KINDS, jokerSellValue } from "./jokers";
import { rollChance } from "../dev/chanceOverride";

export const TAROT_BASE_PRICE = 3;
export const HERMIT_MONEY_CAP = 20;
export const TEMPERANCE_MONEY_CAP = 50;
export const WHEEL_OF_FORTUNE_CHANCE = 0.25;

export const tarotRngConfig: { rng: RandomSource } = { rng: Math.random };

export type TarotEffect =
  | {
      readonly kind: "apply-enhancement";
      readonly enhancement: Enhancement;
      readonly maxTargets: 1 | 2 | 3;
    }
  | {
      readonly kind: "money-multiply";
      readonly multiplier: number;
      readonly bonusCap: number;
    }
  | {
      readonly kind: "joker-sell-value-payout";
      readonly cap: number;
    }
  | {
      readonly kind: "edition-roll";
      readonly chance: number;
    }
  | {
      readonly kind: "destroy-selected";
      readonly maxTargets: 1 | 2 | 3;
    }
  | {
      readonly kind: "rank-up-selected";
      readonly maxTargets: 1 | 2 | 3;
    }
  | {
      readonly kind: "convert-suit";
      readonly suit: Suit;
      readonly maxTargets: 3;
    };

export interface TarotCard {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly effect: TarotEffect;
}

type TarotSpec = Omit<TarotCard, "description">;

function describe(spec: TarotSpec): string {
  const effect = spec.effect;
  if (effect.kind === "money-multiply") {
    return `Doubles current money (max +$${effect.bonusCap})`;
  }
  if (effect.kind === "joker-sell-value-payout") {
    return `Earn the total sell value of equipped jokers (max +$${effect.cap})`;
  }
  if (effect.kind === "edition-roll") {
    const pct = Math.round(effect.chance * 100);
    return `${pct}% chance to add a random edition to a random Joker`;
  }
  if (effect.kind === "destroy-selected") {
    const targets =
      effect.maxTargets === 1 ? "1 card" : `up to ${effect.maxTargets} cards`;
    return `Destroy ${targets} in hand`;
  }
  if (effect.kind === "rank-up-selected") {
    const targets =
      effect.maxTargets === 1 ? "1 card" : `up to ${effect.maxTargets} cards`;
    return `Increase rank of ${targets} in hand by 1`;
  }
  if (effect.kind === "convert-suit") {
    return `Convert up to ${effect.maxTargets} cards in hand to ${SUIT_DISPLAY[effect.suit]}`;
  }
  const targets = effect.maxTargets === 1 ? "1 card" : `up to ${effect.maxTargets} cards`;
  return `Apply ${effect.enhancement} enhancement to ${targets} in hand`;
}

const SUIT_DISPLAY: Readonly<Record<Suit, string>> = {
  diamonds: "♦ Diamonds",
  clubs: "♣ Clubs",
  hearts: "♥ Hearts",
  spades: "♠ Spades",
};

const TAROT_SPECS: ReadonlyArray<TarotSpec> = [
  { id: "the-magician", name: "The Magician", effect: { kind: "apply-enhancement", enhancement: "lucky", maxTargets: 2 } },
  { id: "the-empress", name: "The Empress", effect: { kind: "apply-enhancement", enhancement: "mult", maxTargets: 2 } },
  { id: "the-hierophant", name: "The Hierophant", effect: { kind: "apply-enhancement", enhancement: "bonus", maxTargets: 2 } },
  { id: "the-lovers", name: "The Lovers", effect: { kind: "apply-enhancement", enhancement: "wild", maxTargets: 1 } },
  { id: "the-chariot", name: "The Chariot", effect: { kind: "apply-enhancement", enhancement: "steel", maxTargets: 1 } },
  { id: "justice", name: "Justice", effect: { kind: "apply-enhancement", enhancement: "glass", maxTargets: 1 } },
  { id: "the-devil", name: "The Devil", effect: { kind: "apply-enhancement", enhancement: "gold", maxTargets: 1 } },
  { id: "the-tower", name: "The Tower", effect: { kind: "apply-enhancement", enhancement: "stone", maxTargets: 1 } },
  { id: "the-hanged-man", name: "The Hanged Man", effect: { kind: "destroy-selected", maxTargets: 2 } },
  { id: "strength", name: "Strength", effect: { kind: "rank-up-selected", maxTargets: 2 } },
  { id: "the-star", name: "The Star", effect: { kind: "convert-suit", suit: "diamonds", maxTargets: 3 } },
  { id: "the-moon", name: "The Moon", effect: { kind: "convert-suit", suit: "clubs", maxTargets: 3 } },
  { id: "the-sun", name: "The Sun", effect: { kind: "convert-suit", suit: "hearts", maxTargets: 3 } },
  { id: "the-world", name: "The World", effect: { kind: "convert-suit", suit: "spades", maxTargets: 3 } },
  { id: "the-hermit", name: "The Hermit", effect: { kind: "money-multiply", multiplier: 2, bonusCap: HERMIT_MONEY_CAP } },
  { id: "temperance", name: "Temperance", effect: { kind: "joker-sell-value-payout", cap: TEMPERANCE_MONEY_CAP } },
  {
    id: "wheel-of-fortune",
    name: "Wheel of Fortune",
    effect: { kind: "edition-roll", chance: WHEEL_OF_FORTUNE_CHANCE },
  },
];

export function createTarotCatalog(): TarotCard[] {
  return TAROT_SPECS.map((spec) => ({ ...spec, description: describe(spec) }));
}

export function nextRankUp(rank: Rank): Rank {
  const idx = RANKS.indexOf(rank);
  if (idx < 0) return rank;
  return RANKS[(idx + 1) % RANKS.length];
}

export function resolveHermitPayout(currentMoney: number, cap: number = HERMIT_MONEY_CAP): number {
  if (currentMoney <= 0) return 0;
  return Math.min(currentMoney, cap);
}

export function resolveTemperancePayout(
  jokers: ReadonlyArray<Joker>,
  cap: number = TEMPERANCE_MONEY_CAP,
): number {
  const total = jokers.reduce((sum, j) => sum + jokerSellValue(j), 0);
  return Math.min(cap, total);
}

export interface WheelOfFortuneResult {
  readonly hit: boolean;
  readonly targetIdx: number;
  readonly edition: JokerEdition;
}

export function rollWheelOfFortune(
  jokers: ReadonlyArray<Joker>,
  chance: number = WHEEL_OF_FORTUNE_CHANCE,
  rng: RandomSource = tarotRngConfig.rng,
): WheelOfFortuneResult {
  const hit = rollChance(chance, rng);
  const targetIdx =
    jokers.length === 0 ? -1 : Math.floor(rng() * jokers.length);
  const edition =
    JOKER_EDITION_KINDS[Math.floor(rng() * JOKER_EDITION_KINDS.length)];
  return { hit, targetIdx, edition };
}
