import type { Card, Enhancement, Rank, Suit } from "./types";

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

export function nextCardId(): number {
  return ++cardIdCounter;
}

export const RANK_ENHANCEMENTS: Readonly<Partial<Record<Rank, Enhancement>>> = {
  A: "steel",
  "4": "mult",
  "9": "wild",
  K: "glass",
  "3": "stone",
  Q: "lucky",
};

export function defaultEnhancementForRank(rank: Rank): Enhancement {
  return RANK_ENHANCEMENTS[rank] ?? "gold";
}

export function cardKey(card: Pick<Card, "rank" | "suit">): string {
  return `${card.rank}-${card.suit}`;
}

export function createDeck(
  excludedKeys: ReadonlySet<string> = new Set(),
  startingId?: number,
): Card[] {
  const deck: Card[] = [];
  let nextId = startingId ?? cardIdCounter;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      if (excludedKeys.has(cardKey({ rank, suit }))) continue;
      deck.push({
        id: ++nextId,
        rank,
        suit,
      });
    }
  }
  if (startingId === undefined) {
    cardIdCounter = nextId;
  }
  return deck;
}

/**
 * Test-only seam: when `localStorage["browslatro:deterministicShuffle"]`
 * is `"1"` at module import time, `shuffle` returns the input unchanged so
 * Playwright tests can assert against a fixed dealt hand. Off by default in
 * production; any other value (or missing storage) preserves real shuffling.
 */
const DETERMINISTIC_SHUFFLE_KEY = "browslatro:deterministicShuffle";

function readDeterministicShuffleFlag(): boolean {
  try {
    return window.localStorage.getItem(DETERMINISTIC_SHUFFLE_KEY) === "1";
  } catch {
    return false;
  }
}

export function shuffle<T>(items: ReadonlyArray<T>, rng: () => number = Math.random): T[] {
  if (readDeterministicShuffleFlag()) {
    return items.slice();
  }
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

export function drawCountForRefill(
  handSize: number,
  keptCount: number,
  remainingCount: number,
): number {
  return Math.min(Math.max(0, handSize - keptCount), remainingCount);
}

export type SortMode = "rank" | "suit";

export const SUIT_DISPLAY_ORDER: Record<Suit, number> = {
  clubs: 0,
  diamonds: 1,
  spades: 2,
  hearts: 3,
};

const RANK_DISPLAY_ORDER: Record<Rank, number> = {
  "2": 0,
  "3": 1,
  "4": 2,
  "5": 3,
  "6": 4,
  "7": 5,
  "8": 6,
  "9": 7,
  "10": 8,
  J: 9,
  Q: 10,
  K: 11,
  A: 12,
};

export function sortCards(
  cards: ReadonlyArray<Card>,
  mode: SortMode,
): Card[] {
  const arr = cards.slice();
  if (mode === "rank") {
    arr.sort(
      (a, b) =>
        RANK_DISPLAY_ORDER[b.rank] - RANK_DISPLAY_ORDER[a.rank] ||
        SUIT_DISPLAY_ORDER[a.suit] - SUIT_DISPLAY_ORDER[b.suit],
    );
  } else {
    arr.sort(
      (a, b) =>
        SUIT_DISPLAY_ORDER[a.suit] - SUIT_DISPLAY_ORDER[b.suit] ||
        RANK_DISPLAY_ORDER[b.rank] - RANK_DISPLAY_ORDER[a.rank],
    );
  }
  return arr;
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
  for (const suit of SUITS) {
    grouped[suit].sort(
      (a, b) => RANK_DISPLAY_ORDER[b.rank] - RANK_DISPLAY_ORDER[a.rank],
    );
  }
  return grouped;
}
