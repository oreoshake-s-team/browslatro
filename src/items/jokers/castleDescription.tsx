import type { ReactNode } from "react";
import type { Suit } from "../../cards/types";
import { SUIT_GLYPHS } from "../../cards/deck";

const SUIT_CLASS: Record<Suit, string> = {
  spades: "castle-suit-spades",
  hearts: "castle-suit-hearts",
  diamonds: "castle-suit-diamonds",
  clubs: "castle-suit-clubs",
};

const UNSET_SUFFIX = "Suit is chosen when the blind starts";

export function castleDescriptionText(
  base: string,
  suit: Suit | null,
  suitName: string | null,
): string {
  if (suit === null || suitName === null) {
    return `${base} — ${UNSET_SUFFIX}`;
  }
  return `${base} — Currently: ${SUIT_GLYPHS[suit]} ${suitName}`;
}

export function castleDescriptionNode(
  base: string,
  suit: Suit | null,
  suitName: string | null,
): ReactNode {
  if (suit === null || suitName === null) {
    return `${base} — ${UNSET_SUFFIX}`;
  }
  return (
    <>
      {base} — Currently:{" "}
      <strong className={SUIT_CLASS[suit]}>
        {SUIT_GLYPHS[suit]} {suitName}
      </strong>
    </>
  );
}
