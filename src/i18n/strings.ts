import type { Card, Suit } from "../cards/types";

const SUIT_NAMES: Record<Suit, string> = {
  spades: "Spades",
  hearts: "Hearts",
  diamonds: "Diamonds",
  clubs: "Clubs",
};

export function cardName(card: Pick<Card, "rank" | "suit">): string {
  return `${card.rank} of ${SUIT_NAMES[card.suit]}`;
}
