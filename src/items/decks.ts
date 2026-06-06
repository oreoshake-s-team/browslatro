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

export type DeckCompositionTransform =
  | "drop-face-cards"
  | "spades-and-hearts-only";

export type DeckModifier =
  | { readonly kind: "starting-money-delta"; readonly amount: number }
  | { readonly kind: "starting-discards-delta"; readonly amount: number }
  | { readonly kind: "starting-hands-delta"; readonly amount: number }
  | { readonly kind: "joker-slots-delta"; readonly amount: number }
  | {
      readonly kind: "deck-composition";
      readonly transform: DeckCompositionTransform;
    };

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
  {
    id: "blue-deck",
    name: "Blue Deck",
    description: "+1 hand each round.",
    implemented: true,
    modifiers: [{ kind: "starting-hands-delta", amount: 1 }],
  },
  { id: "green-deck", name: "Green Deck", description: "At end of round, +$2 per remaining hand and discard; no interest.", implemented: false, modifiers: [] },
  {
    id: "black-deck",
    name: "Black Deck",
    description: "+1 joker slot, -1 hand each round.",
    implemented: true,
    modifiers: [
      { kind: "joker-slots-delta", amount: 1 },
      { kind: "starting-hands-delta", amount: -1 },
    ],
  },
  { id: "magic-deck", name: "Magic Deck", description: "Start with Crystal Ball voucher and 2 copies of The Fool.", implemented: false, modifiers: [] },
  { id: "nebula-deck", name: "Nebula Deck", description: "Start with Telescope voucher; -1 consumable slot.", implemented: false, modifiers: [] },
  { id: "ghost-deck", name: "Ghost Deck", description: "Spectral cards may appear in shop; start with Hex spectral.", implemented: false, modifiers: [] },
  {
    id: "abandoned-deck",
    name: "Abandoned Deck",
    description: "Start run with no face cards (J, Q, K) in deck.",
    implemented: true,
    modifiers: [{ kind: "deck-composition", transform: "drop-face-cards" }],
  },
  {
    id: "checkered-deck",
    name: "Checkered Deck",
    description: "Start with 26 Spades and 26 Hearts.",
    implemented: true,
    modifiers: [
      { kind: "deck-composition", transform: "spades-and-hearts-only" },
    ],
  },
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

type AmountDeckModifier = Extract<DeckModifier, { amount: number }>;

function sumDeckModifier<K extends AmountDeckModifier["kind"]>(
  deck: Deck,
  kind: K,
): number {
  return getActiveDeckModifiers(deck)
    .filter(
      (m): m is Extract<AmountDeckModifier, { kind: K }> => m.kind === kind,
    )
    .reduce((sum, m) => sum + m.amount, 0);
}

export const deckStartingMoneyDelta = (deck: Deck): number =>
  sumDeckModifier(deck, "starting-money-delta");

export const deckStartingDiscardsDelta = (deck: Deck): number =>
  sumDeckModifier(deck, "starting-discards-delta");

export const deckStartingHandsDelta = (deck: Deck): number =>
  sumDeckModifier(deck, "starting-hands-delta");

export const deckJokerSlotsDelta = (deck: Deck): number =>
  sumDeckModifier(deck, "joker-slots-delta");

export function deckCompositionTransforms(
  deck: Deck,
): ReadonlyArray<DeckCompositionTransform> {
  return getActiveDeckModifiers(deck)
    .filter(
      (m): m is Extract<DeckModifier, { kind: "deck-composition" }> =>
        m.kind === "deck-composition",
    )
    .map((m) => m.transform);
}
