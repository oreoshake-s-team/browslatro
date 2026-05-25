import type { Card, Rank, Suit } from "./types";

export const MAX_JOKERS = 5;
export const BUSINESS_CARD_PROC_CHANCE = 0.5;
export const SUIT_MULT_AMOUNT = 3;

const FACE_RANKS: ReadonlySet<Rank> = new Set<Rank>(["J", "Q", "K"]);

export type RandomSource = () => number;

export type JokerEffect =
  | { readonly kind: "additive-mult"; readonly amount: number }
  | { readonly kind: "business-card"; readonly chance: number; readonly payout: number }
  | { readonly kind: "stencil" }
  | { readonly kind: "per-suit-mult"; readonly suit: Suit; readonly amount: number };

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

export interface JokerHandResult {
  readonly additiveMult: number;
  readonly xMult: number;
  readonly firedJokerIds: ReadonlyArray<string>;
}

export interface JokerCardResult {
  readonly moneyEarned: number;
  readonly additiveMult: number;
  readonly firedJokerIds: ReadonlyArray<string>;
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

export function createGreedyJoker(): Joker {
  return {
    id: "greedy-joker",
    name: "Greedy Joker",
    description: "+3 Mult per scored Diamond",
    effect: { kind: "per-suit-mult", suit: "diamonds", amount: SUIT_MULT_AMOUNT },
  };
}

export function createLustyJoker(): Joker {
  return {
    id: "lusty-joker",
    name: "Lusty Joker",
    description: "+3 Mult per scored Heart",
    effect: { kind: "per-suit-mult", suit: "hearts", amount: SUIT_MULT_AMOUNT },
  };
}

export function createWrathfulJoker(): Joker {
  return {
    id: "wrathful-joker",
    name: "Wrathful Joker",
    description: "+3 Mult per scored Spade",
    effect: { kind: "per-suit-mult", suit: "spades", amount: SUIT_MULT_AMOUNT },
  };
}

export function createGluttonousJoker(): Joker {
  return {
    id: "gluttonous-joker",
    name: "Gluttonous Joker",
    description: "+3 Mult per scored Club",
    effect: { kind: "per-suit-mult", suit: "clubs", amount: SUIT_MULT_AMOUNT },
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

function assertNeverEffect(effect: never): never {
  throw new Error(
    `Unhandled joker effect: ${JSON.stringify(effect)}`,
  );
}

export function applyHandLevelJokers(
  jokers: ReadonlyArray<Joker>,
): JokerHandResult {
  let additiveMult = 0;
  let xMult = 1;
  const fired: string[] = [];

  for (let i = 0; i < jokers.length; i += 1) {
    const joker = jokers[i];
    const effect = joker.effect;
    switch (effect.kind) {
      case "additive-mult": {
        additiveMult += effect.amount;
        fired.push(joker.id);
        break;
      }
      case "stencil": {
        const emptySlots = MAX_JOKERS - jokers.length;
        if (emptySlots > 0) {
          xMult *= emptySlots;
          fired.push(joker.id);
        }
        break;
      }
      case "business-card":
      case "per-suit-mult":
        break;
      default:
        assertNeverEffect(effect);
    }
  }

  return { additiveMult, xMult, firedJokerIds: fired };
}

export function applyPerCardJokers(
  jokers: ReadonlyArray<Joker>,
  card: Card,
  rng: RandomSource = Math.random,
): JokerCardResult {
  let moneyEarned = 0;
  let additiveMult = 0;
  const fired: string[] = [];

  for (let i = 0; i < jokers.length; i += 1) {
    const joker = jokers[i];
    const effect = joker.effect;
    switch (effect.kind) {
      case "business-card": {
        if (isFaceCard(card) && rng() < effect.chance) {
          moneyEarned += effect.payout;
          fired.push(joker.id);
        }
        break;
      }
      case "per-suit-mult": {
        if (card.suit === effect.suit) {
          additiveMult += effect.amount;
          fired.push(joker.id);
        }
        break;
      }
      case "additive-mult":
      case "stencil":
        break;
      default:
        assertNeverEffect(effect);
    }
  }

  return { moneyEarned, additiveMult, firedJokerIds: fired };
}

export function applyJokersToScoring(
  jokers: ReadonlyArray<Joker>,
  scoredCards: ReadonlyArray<Card>,
  rng: RandomSource = Math.random,
): JokerScoringResult {
  const handResult = applyHandLevelJokers(jokers);
  let moneyEarned = 0;
  let perCardAdditiveMult = 0;
  for (let c = 0; c < scoredCards.length; c += 1) {
    const cardResult = applyPerCardJokers(jokers, scoredCards[c], rng);
    moneyEarned += cardResult.moneyEarned;
    perCardAdditiveMult += cardResult.additiveMult;
  }
  return {
    additiveMult: handResult.additiveMult + perCardAdditiveMult,
    xMult: handResult.xMult,
    moneyEarned,
  };
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
