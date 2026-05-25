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

export interface JokerHandResult {
  readonly additiveMult: number;
  readonly xMult: number;
  readonly firedJokerIds: ReadonlyArray<string>;
}

export interface JokerCardResult {
  readonly moneyEarned: number;
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

export function createDefaultJokers(): Joker[] {
  return [
    createPlusFourMultJoker(),
    createBusinessCardJoker(),
    createJokerStencilJoker(),
  ];
}

// The pool the post-round shop samples from. Returning factories (not
// memoized joker objects) keeps each call independent so the sampler
// can pick the same template more than once without sharing references.
export const SHOP_JOKER_POOL: ReadonlyArray<() => Joker> = [
  createPlusFourMultJoker,
  createBusinessCardJoker,
  createJokerStencilJoker,
];

// Monotonically-increasing counter so every joker minted into the
// equipped set has a globally-unique React key, even when the shop
// sells a duplicate of an already-equipped template.
let nextJokerInstanceCounter = 0;

export function cloneJokerWithFreshId(joker: Joker): Joker {
  nextJokerInstanceCounter += 1;
  return { ...joker, id: `${joker.id}-instance-${nextJokerInstanceCounter}` };
}

// Sample `count` jokers from the shop pool, allowing duplicates. Each
// returned joker has a fresh instance id so two offers (or two purchased
// copies of the same template) never collide as React keys.
export function sampleShopJokers(
  count: number,
  rng: RandomSource = Math.random,
): Joker[] {
  const offers: Joker[] = [];
  for (let i = 0; i < count; i += 1) {
    const idx = Math.floor(rng() * SHOP_JOKER_POOL.length);
    const template = SHOP_JOKER_POOL[idx]();
    offers.push(cloneJokerWithFreshId(template));
  }
  return offers;
}

export function isFaceCard(card: Card): boolean {
  return FACE_RANKS.has(card.rank);
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
    if (effect.kind === "additive-mult") {
      additiveMult += effect.amount;
      fired.push(joker.id);
    } else if (effect.kind === "stencil") {
      const emptySlots = MAX_JOKERS - jokers.length;
      if (emptySlots > 0) {
        xMult *= emptySlots;
        fired.push(joker.id);
      }
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
  const fired: string[] = [];

  for (let i = 0; i < jokers.length; i += 1) {
    const joker = jokers[i];
    const effect = joker.effect;
    if (effect.kind === "business-card") {
      if (isFaceCard(card) && rng() < effect.chance) {
        moneyEarned += effect.payout;
        fired.push(joker.id);
      }
    }
  }

  return { moneyEarned, firedJokerIds: fired };
}

export function applyJokersToScoring(
  jokers: ReadonlyArray<Joker>,
  scoredCards: ReadonlyArray<Card>,
  rng: RandomSource = Math.random,
): JokerScoringResult {
  const handResult = applyHandLevelJokers(jokers);
  let moneyEarned = 0;
  for (let c = 0; c < scoredCards.length; c += 1) {
    const cardResult = applyPerCardJokers(jokers, scoredCards[c], rng);
    moneyEarned += cardResult.moneyEarned;
  }
  return {
    additiveMult: handResult.additiveMult,
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
