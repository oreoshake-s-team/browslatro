import type { Card, Rank, Suit } from "../cards/types";

type CardExtras = Partial<
  Pick<Card, "enhancement" | "seal" | "edition" | "faceDown">
>;

export function makeCard(
  id: number,
  rank: Rank,
  suit: Suit,
  extras: CardExtras = {},
): Card {
  return { id, rank, suit, ...extras };
}

export const FLUSH_HAND: ReadonlyArray<Card> = [
  makeCard(9001, "A", "spades"),
  makeCard(9002, "K", "spades"),
  makeCard(9003, "10", "spades"),
  makeCard(9004, "7", "spades"),
  makeCard(9005, "4", "spades"),
];

export const MIXED_HAND: ReadonlyArray<Card> = [
  makeCard(9101, "A", "spades"),
  makeCard(9102, "A", "hearts"),
  makeCard(9103, "K", "diamonds", { enhancement: "glass" }),
  makeCard(9104, "Q", "clubs", { seal: "red" }),
  makeCard(9105, "J", "hearts", { edition: "foil" }),
  makeCard(9106, "9", "diamonds", { enhancement: "steel" }),
  makeCard(9107, "5", "clubs", { enhancement: "gold", seal: "gold" }),
  makeCard(9108, "2", "spades", { enhancement: "lucky" }),
];
