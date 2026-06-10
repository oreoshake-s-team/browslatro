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

export type Enhancement =
  | "bonus"
  | "mult"
  | "wild"
  | "glass"
  | "steel"
  | "stone"
  | "gold"
  | "lucky";

export type Seal = "gold" | "red" | "blue" | "purple";

export type CardEdition = "foil" | "holographic" | "polychrome";

export interface Card {
  readonly id: number;
  readonly rank: Rank;
  readonly bonusChips?: number;
  readonly suit: Suit;
  readonly enhancement?: Enhancement | null;
  readonly seal?: Seal | null;
  readonly edition?: CardEdition | null;
  readonly faceDown?: boolean;
}