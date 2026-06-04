export type Deck =
  | "red-deck"
  | "blue-deck"
  | "yellow-deck"
  | "green-deck"
  | "black-deck"
  | "magic-deck"
  | "nebula-deck"
  | "ghost-deck"
  | "abandoned-deck"
  | "checkered-deck"
  | "zodiac-deck"
  | "painted-deck"
  | "anaglyph-deck"
  | "plasma-deck"
  | "erratic-deck";

export const DEFAULT_DECK: Deck = "red-deck";

export type DeckModifier =
  | { readonly kind: "starting-money-delta"; readonly amount: number }
  | { readonly kind: "starting-discards-delta"; readonly amount: number };

export interface DeckSpec {
  readonly id: Deck;
  readonly name: string;
  readonly description: string;
  readonly implemented: boolean;
  readonly modifiers: ReadonlyArray<DeckModifier>;
}

const DECK_SPECS: ReadonlyArray<DeckSpec> = [
  {
    id: "red-deck",
    name: "Red Deck",
    description: "+1 discard each round.",
    implemented: true,
    modifiers: [{ kind: "starting-discards-delta", amount: 1 }],
  },
  {
    id: "yellow-deck",
    name: "Yellow Deck",
    description: "Start each run with $10 extra.",
    implemented: true,
    modifiers: [{ kind: "starting-money-delta", amount: 10 }],
  },
  { id: "blue-deck", name: "Blue Deck", description: "+1 hand each round.", implemented: false, modifiers: [] },
  { id: "green-deck", name: "Green Deck", description: "At end of round, +$2 per remaining hand and discard; no interest.", implemented: false, modifiers: [] },
  { id: "black-deck", name: "Black Deck", description: "+1 joker slot, -1 hand each round.", implemented: false, modifiers: [] },
  { id: "magic-deck", name: "Magic Deck", description: "Start with Crystal Ball voucher and 2 copies of The Fool.", implemented: false, modifiers: [] },
  { id: "nebula-deck", name: "Nebula Deck", description: "Start with Telescope voucher; -1 consumable slot.", implemented: false, modifiers: [] },
  { id: "ghost-deck", name: "Ghost Deck", description: "Spectral cards may appear in shop; start with Hex spectral.", implemented: false, modifiers: [] },
  { id: "abandoned-deck", name: "Abandoned Deck", description: "Start run with no face cards in deck.", implemented: false, modifiers: [] },
  { id: "checkered-deck", name: "Checkered Deck", description: "Start with 26 Spades and 26 Hearts.", implemented: false, modifiers: [] },
  { id: "zodiac-deck", name: "Zodiac Deck", description: "Start with Tarot Merchant, Planet Merchant, and Overstock vouchers.", implemented: false, modifiers: [] },
  { id: "painted-deck", name: "Painted Deck", description: "+2 hand size, -1 joker slot.", implemented: false, modifiers: [] },
  { id: "anaglyph-deck", name: "Anaglyph Deck", description: "Gain a Double Tag after each Boss Blind defeat.", implemented: false, modifiers: [] },
  { id: "plasma-deck", name: "Plasma Deck", description: "Balance Chips and Mult before scoring; 2x Big Blind size.", implemented: false, modifiers: [] },
  { id: "erratic-deck", name: "Erratic Deck", description: "Starting deck has random ranks and suits.", implemented: false, modifiers: [] },
];

export function createDeckCatalog(): ReadonlyArray<DeckSpec> {
  return DECK_SPECS;
}

export function getDeckSpec(id: Deck): DeckSpec {
  const spec = DECK_SPECS.find((d) => d.id === id);
  if (!spec) throw new Error(`unknown deck: ${id}`);
  return spec;
}

export function getActiveDeckModifiers(deck: Deck): ReadonlyArray<DeckModifier> {
  return getDeckSpec(deck).modifiers;
}

export function deckStartingMoneyDelta(deck: Deck): number {
  return getActiveDeckModifiers(deck)
    .filter(
      (m): m is Extract<DeckModifier, { kind: "starting-money-delta" }> =>
        m.kind === "starting-money-delta",
    )
    .reduce((sum, m) => sum + m.amount, 0);
}

export function deckStartingDiscardsDelta(deck: Deck): number {
  return getActiveDeckModifiers(deck)
    .filter(
      (m): m is Extract<DeckModifier, { kind: "starting-discards-delta" }> =>
        m.kind === "starting-discards-delta",
    )
    .reduce((sum, m) => sum + m.amount, 0);
}
