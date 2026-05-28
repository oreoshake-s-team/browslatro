import type { Card, Enhancement, Rank, Seal, Suit } from "../cards/types";
import { SUITS, nextCardId } from "../cards/deck";
import type { JokerRarity } from "./jokers";

export const SPECTRAL_BASE_PRICE = 4;

export const IMMOLATE_DESTROY_COUNT = 5;
export const IMMOLATE_MONEY_GAIN = 20;

export const FAMILIAR_ADD_COUNT = 3;
export const GRIM_ADD_COUNT = 2;
export const INCANTATION_ADD_COUNT = 4;

export const CRYPTID_COPY_COUNT = 2;

export const ECTOPLASM_HAND_SIZE_DELTA = -1;

export type TransmuteRankFilter = "face" | "ace" | "numbered";

export type SpectralEffect =
  | { readonly kind: "black-hole" }
  | { readonly kind: "immolate"; readonly destroyCount: number; readonly moneyGain: number }
  | { readonly kind: "sigil" }
  | { readonly kind: "apply-seal"; readonly seal: Seal; readonly maxTargets: 1 }
  | { readonly kind: "duplicate-selected"; readonly copies: number; readonly maxTargets: 1 }
  | {
      readonly kind: "transmute";
      readonly rankFilter: TransmuteRankFilter;
      readonly addCount: number;
    }
  | {
      readonly kind: "create-joker-by-rarity";
      readonly rarity: JokerRarity;
      readonly setMoneyToZero: boolean;
    }
  | { readonly kind: "ectoplasm"; readonly handSizeDelta: number };

export function spectralNeedsTarget(effect: SpectralEffect): boolean {
  return effect.kind === "apply-seal" || effect.kind === "duplicate-selected";
}

export interface SpectralCard {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly effect: SpectralEffect;
}

type SpectralSpec = Omit<SpectralCard, "description">;

const SEAL_DISPLAY: Record<Seal, string> = {
  gold: "Gold",
  red: "Red",
  blue: "Blue",
  purple: "Purple",
};

const FACE_RANKS: ReadonlyArray<Rank> = ["J", "Q", "K"];
const ACE_RANKS: ReadonlyArray<Rank> = ["A"];
const NUMBERED_RANKS: ReadonlyArray<Rank> = [
  "2", "3", "4", "5", "6", "7", "8", "9", "10",
];

const TRANSMUTE_LABEL: Record<TransmuteRankFilter, string> = {
  face: "face cards",
  ace: "Aces",
  numbered: "numbered cards",
};

const RANDOM_ENHANCEMENTS: ReadonlyArray<Enhancement> = [
  "bonus",
  "mult",
  "wild",
  "glass",
  "steel",
  "stone",
  "gold",
  "lucky",
];

export type SpectralRandomSource = () => number;

function ranksForFilter(filter: TransmuteRankFilter): ReadonlyArray<Rank> {
  if (filter === "face") return FACE_RANKS;
  if (filter === "ace") return ACE_RANKS;
  return NUMBERED_RANKS;
}

function pickFrom<T>(items: ReadonlyArray<T>, rng: SpectralRandomSource): T {
  return items[Math.floor(rng() * items.length)];
}

export function makeEnhancedCard(
  filter: TransmuteRankFilter,
  rng: SpectralRandomSource,
): Card {
  const rank = pickFrom(ranksForFilter(filter), rng);
  const suit: Suit = pickFrom(SUITS, rng);
  const enhancement = pickFrom(RANDOM_ENHANCEMENTS, rng);
  return { id: nextCardId(), rank, suit, enhancement };
}

export function transmuteHand(
  hand: ReadonlyArray<Card>,
  filter: TransmuteRankFilter,
  addCount: number,
  rng: SpectralRandomSource,
): ReadonlyArray<Card> {
  if (hand.length === 0) {
    const additions: Card[] = [];
    for (let i = 0; i < addCount; i += 1) additions.push(makeEnhancedCard(filter, rng));
    return additions;
  }
  const destroyIdx = Math.floor(rng() * hand.length);
  const kept = hand.filter((_, i) => i !== destroyIdx);
  const additions: Card[] = [];
  for (let i = 0; i < addCount; i += 1) additions.push(makeEnhancedCard(filter, rng));
  return [...kept, ...additions];
}

export function duplicateSelectedInHand(
  hand: ReadonlyArray<Card>,
  selectedIds: ReadonlySet<number>,
  copies: number,
): ReadonlyArray<Card> {
  const selected = hand.filter((c) => selectedIds.has(c.id));
  if (selected.length !== 1) return hand;
  const original = selected[0];
  const additions: Card[] = [];
  for (let i = 0; i < copies; i += 1) {
    additions.push({ ...original, id: nextCardId() });
  }
  return [...hand, ...additions];
}

function describe(spec: SpectralSpec): string {
  const effect = spec.effect;
  switch (effect.kind) {
    case "black-hole":
      return "Upgrade every poker hand by 1 level";
    case "immolate":
      return `Destroys ${effect.destroyCount} random cards in hand, gain $${effect.moneyGain}`;
    case "sigil":
      return "Converts all cards in hand to a single random suit";
    case "apply-seal":
      return `Add a ${SEAL_DISPLAY[effect.seal]} Seal to 1 selected card in your hand`;
    case "duplicate-selected":
      return `Create ${effect.copies} copies of 1 selected card in your hand`;
    case "transmute":
      return `Destroy 1 random card in hand, add ${effect.addCount} random Enhanced ${TRANSMUTE_LABEL[effect.rankFilter]}`;
    case "create-joker-by-rarity": {
      const rarity = effect.rarity.charAt(0).toUpperCase() + effect.rarity.slice(1);
      const money = effect.setMoneyToZero ? ", set money to $0" : "";
      return `Create a random ${rarity} Joker${money}`;
    }
    case "ectoplasm":
      return `Add Negative to a random Joker, ${effect.handSizeDelta} hand size`;
  }
}

const SPECTRAL_SPECS: ReadonlyArray<SpectralSpec> = [
  { id: "black-hole", name: "Black Hole", effect: { kind: "black-hole" } },
  {
    id: "immolate",
    name: "Immolate",
    effect: {
      kind: "immolate",
      destroyCount: IMMOLATE_DESTROY_COUNT,
      moneyGain: IMMOLATE_MONEY_GAIN,
    },
  },
  { id: "sigil", name: "Sigil", effect: { kind: "sigil" } },
  {
    id: "talisman",
    name: "Talisman",
    effect: { kind: "apply-seal", seal: "gold", maxTargets: 1 },
  },
  {
    id: "deja-vu",
    name: "Deja Vu",
    effect: { kind: "apply-seal", seal: "red", maxTargets: 1 },
  },
  {
    id: "trance",
    name: "Trance",
    effect: { kind: "apply-seal", seal: "blue", maxTargets: 1 },
  },
  {
    id: "medium",
    name: "Medium",
    effect: { kind: "apply-seal", seal: "purple", maxTargets: 1 },
  },
  {
    id: "familiar",
    name: "Familiar",
    effect: { kind: "transmute", rankFilter: "face", addCount: FAMILIAR_ADD_COUNT },
  },
  {
    id: "grim",
    name: "Grim",
    effect: { kind: "transmute", rankFilter: "ace", addCount: GRIM_ADD_COUNT },
  },
  {
    id: "incantation",
    name: "Incantation",
    effect: {
      kind: "transmute",
      rankFilter: "numbered",
      addCount: INCANTATION_ADD_COUNT,
    },
  },
  {
    id: "wraith",
    name: "Wraith",
    effect: { kind: "create-joker-by-rarity", rarity: "rare", setMoneyToZero: true },
  },
  {
    id: "cryptid",
    name: "Cryptid",
    effect: { kind: "duplicate-selected", copies: CRYPTID_COPY_COUNT, maxTargets: 1 },
  },
  {
    id: "ectoplasm",
    name: "Ectoplasm",
    effect: { kind: "ectoplasm", handSizeDelta: ECTOPLASM_HAND_SIZE_DELTA },
  },
];

export function createSpectralCatalog(): SpectralCard[] {
  return SPECTRAL_SPECS.map((spec) => ({ ...spec, description: describe(spec) }));
}
