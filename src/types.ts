export type Blind = 1 | 2 | 3;
export type BlindValuesMap = Record<Blind, string>;

export interface Hand {
  readonly label: string;
  readonly chips: number;
  readonly multiplier: number;
}

export type Suit = "spades" | "hearts" | "diamonds" | "clubs";

export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A";

export type Enhancement = "gold" | "steel";

export interface Card {
  readonly id: number;
  readonly rank: Rank;
  readonly suit: Suit;
  readonly enhancement?: Enhancement | null;
}