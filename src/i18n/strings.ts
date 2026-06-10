import type { TFunction } from "i18next";
import type { Card, Suit } from "../cards/types";

const SUIT_KEYS = {
  spades: "suits.spades",
  hearts: "suits.hearts",
  diamonds: "suits.diamonds",
  clubs: "suits.clubs",
} as const satisfies Record<Suit, string>;

export function tSuitName(t: TFunction, suit: Suit): string {
  return t(SUIT_KEYS[suit]);
}

export function cardName(
  t: TFunction,
  card: Pick<Card, "rank" | "suit">,
): string {
  return t("a11y.cardName", { rank: card.rank, suit: tSuitName(t, card.suit) });
}
