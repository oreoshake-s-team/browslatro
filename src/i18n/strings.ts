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

export const reorderStrings = {
  moveLeft: (item: string): string => `Move ${item} left`,
  moveRight: (item: string): string => `Move ${item} right`,
  moved: (item: string, position: number, total: number): string =>
    `${item} moved to position ${position} of ${total}`,
  atStart: (item: string): string => `${item} is already at the first position`,
  atEnd: (item: string): string => `${item} is already at the last position`,
};
