export type Blind = 1 | 2 | 3;
export type BlindValuesMap = Record<Blind, string>;

export interface Hand {
  readonly label: string;
  readonly chips: number;
  readonly multiplier: number;
}