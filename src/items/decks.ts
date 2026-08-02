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

import type { VoucherId } from "./vouchers";

export type DeckCompositionTransform =
  | "drop-face-cards"
  | "spades-and-hearts-only"
  | "randomize-ranks-and-suits";

export type DeckModifier =
  | { readonly kind: "starting-money-delta"; readonly amount: number }
  | { readonly kind: "starting-discards-delta"; readonly amount: number }
  | { readonly kind: "starting-hands-delta"; readonly amount: number }
  | { readonly kind: "joker-slots-delta"; readonly amount: number }
  | { readonly kind: "hand-size-delta"; readonly amount: number }
  | { readonly kind: "consumable-slots-delta"; readonly amount: number }
  | {
      readonly kind: "end-of-round-bonus-per-remaining-hand-and-discard";
      readonly amount: number;
    }
  | { readonly kind: "no-interest" }
  | {
      readonly kind: "deck-composition";
      readonly transform: DeckCompositionTransform;
    }
  | { readonly kind: "starting-voucher"; readonly voucherId: VoucherId }
  | { readonly kind: "boss-defeat-tag"; readonly tagId: "double" }
  | { readonly kind: "shop-spectral-offers" }
  | { readonly kind: "balance-chips-mult" }
  | { readonly kind: "blind-size-multiplier"; readonly factor: number }
  | {
      readonly kind: "starting-consumable";
      readonly consumable: "tarot" | "spectral";
      readonly itemId: string;
    };

export type StartingConsumableModifier = Extract<
  DeckModifier,
  { kind: "starting-consumable" }
>;

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
  {
    id: "green-deck",
    name: "Green Deck",
    description:
      "At end of round, +$2 per remaining hand and discard; no interest.",
    implemented: true,
    modifiers: [
      { kind: "end-of-round-bonus-per-remaining-hand-and-discard", amount: 2 },
      { kind: "no-interest" },
    ],
  },
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
  {
    id: "magic-deck",
    name: "Magic Deck",
    description: "Start with Crystal Ball voucher and 2 copies of The Fool.",
    implemented: true,
    modifiers: [
      { kind: "starting-voucher", voucherId: "crystal-ball" },
      { kind: "starting-consumable", consumable: "tarot", itemId: "the-fool" },
      { kind: "starting-consumable", consumable: "tarot", itemId: "the-fool" },
    ],
  },
  {
    id: "nebula-deck",
    name: "Nebula Deck",
    description: "Start with Telescope voucher; -1 consumable slot.",
    implemented: true,
    modifiers: [
      { kind: "starting-voucher", voucherId: "telescope" },
      { kind: "consumable-slots-delta", amount: -1 },
    ],
  },
  {
    id: "ghost-deck",
    name: "Ghost Deck",
    description: "Spectral cards may appear in shop; start with Hex spectral.",
    implemented: true,
    modifiers: [
      { kind: "shop-spectral-offers" },
      { kind: "starting-consumable", consumable: "spectral", itemId: "hex" },
    ],
  },
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
  {
    id: "zodiac-deck",
    name: "Zodiac Deck",
    description:
      "Start with Tarot Merchant, Planet Merchant, and Overstock vouchers.",
    implemented: true,
    modifiers: [
      { kind: "starting-voucher", voucherId: "tarot-merchant" },
      { kind: "starting-voucher", voucherId: "planet-merchant" },
      { kind: "starting-voucher", voucherId: "overstock" },
    ],
  },
  {
    id: "painted-deck",
    name: "Painted Deck",
    description: "+2 hand size, -1 joker slot.",
    implemented: true,
    modifiers: [
      { kind: "hand-size-delta", amount: 2 },
      { kind: "joker-slots-delta", amount: -1 },
    ],
  },
  {
    id: "anaglyph-deck",
    name: "Anaglyph Deck",
    description: "Gain a Double Tag after each Boss Blind defeat.",
    implemented: true,
    modifiers: [{ kind: "boss-defeat-tag", tagId: "double" }],
  },
  {
    id: "plasma-deck",
    name: "Plasma Deck",
    description: "Balance Chips and Mult when scoring; 2x base Blind size.",
    implemented: true,
    modifiers: [
      { kind: "balance-chips-mult" },
      { kind: "blind-size-multiplier", factor: 2 },
    ],
  },
  {
    id: "erratic-deck",
    name: "Erratic Deck",
    description: "Starting deck has random ranks and suits.",
    implemented: true,
    modifiers: [
      { kind: "deck-composition", transform: "randomize-ranks-and-suits" },
    ],
  },
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

export const deckHandSizeDelta = (deck: Deck): number =>
  sumDeckModifier(deck, "hand-size-delta");

export const deckConsumableSlotsDelta = (deck: Deck): number =>
  sumDeckModifier(deck, "consumable-slots-delta");

export const deckEndOfRoundBonusPerRemainingHandAndDiscard = (
  deck: Deck,
): number =>
  sumDeckModifier(deck, "end-of-round-bonus-per-remaining-hand-and-discard");

export const deckSuppressesInterest = (deck: Deck): boolean =>
  getActiveDeckModifiers(deck).some((m) => m.kind === "no-interest");

export function deckStartingVoucherIds(deck: Deck): ReadonlySet<VoucherId> {
  return new Set(
    getActiveDeckModifiers(deck)
      .filter(
        (m): m is Extract<DeckModifier, { kind: "starting-voucher" }> =>
          m.kind === "starting-voucher",
      )
      .map((m) => m.voucherId),
  );
}

export const deckBalancesScore = (deck: Deck): boolean =>
  getActiveDeckModifiers(deck).some((m) => m.kind === "balance-chips-mult");

export function deckBlindSizeMultiplier(deck: Deck): number {
  return getActiveDeckModifiers(deck)
    .filter(
      (m): m is Extract<DeckModifier, { kind: "blind-size-multiplier" }> =>
        m.kind === "blind-size-multiplier",
    )
    .reduce((product, m) => product * m.factor, 1);
}

export const deckAllowsShopSpectrals = (deck: Deck): boolean =>
  getActiveDeckModifiers(deck).some((m) => m.kind === "shop-spectral-offers");

export function deckBossDefeatTagIds(deck: Deck): ReadonlyArray<"double"> {
  return getActiveDeckModifiers(deck)
    .filter(
      (m): m is Extract<DeckModifier, { kind: "boss-defeat-tag" }> =>
        m.kind === "boss-defeat-tag",
    )
    .map((m) => m.tagId);
}

export function deckStartingConsumables(
  deck: Deck,
): ReadonlyArray<StartingConsumableModifier> {
  return getActiveDeckModifiers(deck).filter(
    (m): m is StartingConsumableModifier => m.kind === "starting-consumable",
  );
}

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
