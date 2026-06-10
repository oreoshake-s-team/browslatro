import type { Card, Rank } from "../../../cards/types";
import { JOKER_SELL_VALUE } from "../constants";
import { RENTAL_BASE_PRICE, hasSticker } from "../stickers";
import type { Joker } from "../types";

const FACE_RANKS: ReadonlySet<Rank> = new Set<Rank>(["J", "Q", "K"]);

export function isFaceCard(card: Card): boolean {
  return FACE_RANKS.has(card.rank);
}

export function allCardsAreFaceFromJokers(
  jokers: ReadonlyArray<Joker>,
): boolean {
  for (const j of jokers) {
    if (j.effect.kind === "passive-run-stats" && j.effect.allCardsFace === true) {
      return true;
    }
  }
  return false;
}

export function isFaceCardWith(
  card: Card,
  jokers: ReadonlyArray<Joker>,
): boolean {
  if (isFaceCard(card)) return true;
  return allCardsAreFaceFromJokers(jokers);
}

export function jokerSellValue(joker: Joker): number {
  if (hasSticker(joker, "rental")) return RENTAL_BASE_PRICE;
  const grown =
    joker.effect.kind === "sell-value-grows-per-round" &&
    joker.state?.kind === "counter"
      ? joker.state.value
      : 0;
  return JOKER_SELL_VALUE + grown + (joker.sellBonus ?? 0);
}

export function assertNeverEffect(effect: never): never {
  throw new Error(`Unhandled joker effect: ${JSON.stringify(effect)}`);
}
