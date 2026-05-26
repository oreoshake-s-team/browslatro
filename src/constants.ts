import type { BlindValuesMap, Hand } from "./cards/types";

export const BlindValues: BlindValuesMap = {
  1: "Small Blind",
  2: "Big Blind",
  3: "Boss Blind",
};

export const BASE_CHIPS = [300, 800, 2000, 5000, 11000, 20000, 35000, 50000] as const;
export const BLIND_MULTIPLIERS = [1, 1.5, 2] as const;

// Flat price for every joker offer in the post-round shop. Tuning per
// rarity / ante is a follow-up; one constant keeps the v1 economy simple.
export const JOKER_BASE_PRICE = 5;

export const HANDS: ReadonlyArray<Hand> = [
  { label: "High Card", chips: 5, multiplier: 1 },
  { label: "Pair", chips: 10, multiplier: 2 },
  { label: "Two Pair", chips: 20, multiplier: 2 },
  { label: "Three of a Kind", chips: 30, multiplier: 3 },
  { label: "Straight", chips: 30, multiplier: 4 },
  { label: "Flush", chips: 35, multiplier: 4 },
  { label: "Full House", chips: 40, multiplier: 4 },
  { label: "Four of a Kind", chips: 60, multiplier: 7 },
  { label: "Straight Flush", chips: 100, multiplier: 8 },
  { label: "Royal Flush", chips: 100, multiplier: 8 },
  { label: "Five of a Kind", chips: 120, multiplier: 12 },
  { label: "Flush House", chips: 140, multiplier: 14 },
  { label: "Flush Five", chips: 160, multiplier: 16 },
] as const;