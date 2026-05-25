import type { Card, Rank } from "./types";

export const MAX_JOKERS = 5;
export const BUSINESS_CARD_PROC_CHANCE = 0.5;

const FACE_RANKS: ReadonlySet<Rank> = new Set<Rank>(["J", "Q", "K"]);

export type RandomSource = () => number;

export type JokerEffect =
  | { readonly kind: "additive-mult"; readonly amount: number }
  | { readonly kind: "business-card"; readonly chance: number; readonly payout: number }
  | { readonly kind: "stencil" };

export interface Joker {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly effect: JokerEffect;
}

export interface JokerScoringResult {
  readonly additiveMult: number;
  readonly xMult: number;
  readonly moneyEarned: number;
}

export function createPlusFourMultJoker(): Joker {
  return {
    id: "plus-four-mult",
    name: "+4 Mult",
    description: "Adds +4 Mult to every played hand",
    effect: { kind: "additive-mult", amount: 4 },
  };
}

export function createBusinessCardJoker(): Joker {
  return {
    id: "business-card",
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
    name: "Joker Stencil",
    description: "X1 Mult per empty joker slot",
    effect: { kind: "stencil" },
  };
}

export function createDefaultJokers(): Joker[] {
  return [
    createPlusFourMultJoker(),
    createBusinessCardJoker(),
    createJokerStencilJoker(),
  ];
}

export function isFaceCard(card: Card): boolean {
  return FACE_RANKS.has(card.rank);
}

export function applyJokersToScoring(
  jokers: ReadonlyArray<Joker>,
  scoredCards: ReadonlyArray<Card>,
  rng: RandomSource = Math.random,
): JokerScoringResult {
  let additiveMult = 0;
  let xMult = 1;
  let moneyEarned = 0;

  for (let i = 0; i < jokers.length; i += 1) {
    const joker = jokers[i];
    const effect = joker.effect;
    if (effect.kind === "additive-mult") {
      additiveMult += effect.amount;
    } else if (effect.kind === "business-card") {
      for (let c = 0; c < scoredCards.length; c += 1) {
        const card = scoredCards[c];
        if (!isFaceCard(card)) continue;
        if (rng() < effect.chance) {
          moneyEarned += effect.payout;
        }
      }
    } else {
      const emptySlots = MAX_JOKERS - jokers.length;
      if (emptySlots > 0) {
        xMult *= emptySlots;
      }
    }
  }

  return { additiveMult, xMult, moneyEarned };
}

export function computeFinalScoreWithJokers(
  baseHandChips: number,
  baseHandMultiplier: number,
  cardChipsTotal: number,
  jokerResult: JokerScoringResult,
): number {
  const chipsTotal = baseHandChips + cardChipsTotal;
  const mult = (baseHandMultiplier + jokerResult.additiveMult) * jokerResult.xMult;
  return Math.floor(chipsTotal * mult);
}
