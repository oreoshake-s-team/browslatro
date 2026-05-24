import type { Card, Rank, Suit } from "./types";

export const SUITS: ReadonlyArray<Suit> = [
  "spades",
  "hearts",
  "diamonds",
  "clubs",
];

export const RANKS: ReadonlyArray<Rank> = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];

export const HAND_SIZE = 8;
export const DECK_SIZE = 52;

let cardIdCounter = 0;

export function resetCardIds(): void {
  cardIdCounter = 0;
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: ++cardIdCounter, rank, suit });
    }
  }
  return deck;
}

export function shuffle<T>(items: ReadonlyArray<T>, rng: () => number = Math.random): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface DealResult {
  readonly hand: ReadonlyArray<Card>;
  readonly remaining: ReadonlyArray<Card>;
}

export function deal(deck: ReadonlyArray<Card>, count: number = HAND_SIZE): DealResult {
  return {
    hand: deck.slice(0, count),
    remaining: deck.slice(count),
  };
}

export function groupBySuit(cards: ReadonlyArray<Card>): Record<Suit, Card[]> {
  const grouped: Record<Suit, Card[]> = {
    spades: [],
    hearts: [],
    diamonds: [],
    clubs: [],
  };
  for (const card of cards) {
    grouped[card.suit].push(card);
  }
  return grouped;
}
