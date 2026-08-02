import type { Card, Rank } from "./types";

export const FACE_RANKS: ReadonlySet<Rank> = new Set<Rank>(["J", "Q", "K"]);

export function isFaceCard(card: Card): boolean {
  return FACE_RANKS.has(card.rank);
}
