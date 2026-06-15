import { FOIL_CHIPS, HOLOGRAPHIC_MULT, POLYCHROME_X_MULT } from "../items/jokers";
import type { Card, CardEdition } from "./types";

export const CARD_EDITION_KINDS: ReadonlyArray<CardEdition> = [
  "foil",
  "holographic",
  "polychrome",
];

export interface CardEditionInfo {
  readonly name: string;
  readonly description: string;
}

export const CARD_EDITION_INFO: Readonly<Record<CardEdition, CardEditionInfo>> = {
  foil: {
    name: "Foil",
    description: `+${FOIL_CHIPS} Chips when scored`,
  },
  holographic: {
    name: "Holographic",
    description: `+${HOLOGRAPHIC_MULT} Mult when scored`,
  },
  polychrome: {
    name: "Polychrome",
    description: `×${POLYCHROME_X_MULT} Mult when scored`,
  },
};

export interface CardEditionContribution {
  readonly additiveChips: number;
  readonly additiveMult: number;
  readonly xMult: number;
}

export function withCardEdition<T extends { edition?: CardEdition | null }>(
  card: T,
  edition: CardEdition,
): T {
  return { ...card, edition };
}

export function rollCardEdition(rng: () => number): CardEdition {
  return CARD_EDITION_KINDS[Math.floor(rng() * CARD_EDITION_KINDS.length)];
}

export function applyCardEdition(card: Card): CardEditionContribution | null {
  if (!card.edition) return null;
  switch (card.edition) {
    case "foil":
      return { additiveChips: FOIL_CHIPS, additiveMult: 0, xMult: 1 };
    case "holographic":
      return { additiveChips: 0, additiveMult: HOLOGRAPHIC_MULT, xMult: 1 };
    case "polychrome":
      return { additiveChips: 0, additiveMult: 0, xMult: POLYCHROME_X_MULT };
  }
}
