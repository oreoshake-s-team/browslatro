import type { Card, Rank, Suit } from "../cards/types";
import type { BossBlind } from "../items/bosses";
import type { Joker } from "../items/jokers/types";
import { createDefaultHandStats } from "../scoring/handStats";
import { emptyHandCounts } from "../components/hud/handPlayCounts";
import type { SimulatePlayInput } from "./simulatePlay";

let nextId = 0;

export function card(rank: Rank, suit: Suit, extra?: Partial<Card>): Card {
  return { id: ++nextId, rank, suit, ...extra };
}

export function joker(extra?: Partial<Joker>): Joker {
  return {
    id: "test-joker",
    name: "Test Joker",
    description: "+4 Mult",
    effect: { kind: "additive-mult", amount: 4 },
    rarity: "common",
    ...extra,
  };
}

export function boss(extra?: Partial<BossBlind>): BossBlind {
  return {
    id: "the-wall",
    name: "The Wall",
    description: "Extra large blind requirement.",
    scoreMultiplier: 4,
    anteMin: 2,
    effect: { kind: "none" },
    ...extra,
  };
}

export function simulateInput(
  hand: ReadonlyArray<Card>,
  extra?: Partial<SimulatePlayInput>,
): SimulatePlayInput {
  return {
    dealt: { hand, remaining: [] },
    baseDeckCards: [],
    destroyedCardIds: new Set(),
    addedCards: [],
    cardEnhancementsById: new Map(),
    cardSealsById: new Map(),
    jokers: [],
    handStats: createDefaultHandStats(),
    handPlayCounts: emptyHandCounts(),
    handHistoryThisRound: [],
    playedCardKeysThisAnte: new Set(),
    consumables: [],
    ownedVoucherIds: new Set(),
    blind: 1,
    currentBoss: boss(),
    money: 4,
    remainingHands: 4,
    remainingDiscards: 3,
    runStats: { blindsSkipped: 0 },
    todoHand: null,
    idolTarget: null,
    ancientSuit: null,
    ...extra,
  };
}
