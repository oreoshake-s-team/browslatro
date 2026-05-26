import type { Card, Rank, Suit } from "../cards/types";

const FACE_RANKS: ReadonlySet<Rank> = new Set(["J", "Q", "K"]);

export type BossEffect =
  | { readonly kind: "none" }
  | { readonly kind: "start-with-hands"; readonly value: number }
  | { readonly kind: "start-with-discards"; readonly value: number }
  | { readonly kind: "hand-size-delta"; readonly value: number }
  | { readonly kind: "force-card-count"; readonly value: number }
  | { readonly kind: "money-per-card-played"; readonly value: number }
  | { readonly kind: "debuff-suit"; readonly suit: Suit }
  | { readonly kind: "debuff-face" };

export interface BossBlind {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly scoreMultiplier: number;
  readonly anteMin: number;
  readonly effect: BossEffect;
}

const BOSS_SPECS: ReadonlyArray<BossBlind> = [
  {
    id: "boss-default",
    name: "Boss Blind",
    description: "A standard boss blind. Score at least the required chips.",
    scoreMultiplier: 2,
    anteMin: 1,
    effect: { kind: "none" },
  },
  {
    id: "the-wall",
    name: "The Wall",
    description: "Extra large blind requirement.",
    scoreMultiplier: 4,
    anteMin: 2,
    effect: { kind: "none" },
  },
  {
    id: "the-needle",
    name: "The Needle",
    description: "Play only 1 hand.",
    scoreMultiplier: 1,
    anteMin: 2,
    effect: { kind: "start-with-hands", value: 1 },
  },
  {
    id: "the-water",
    name: "The Water",
    description: "Start with 0 discards.",
    scoreMultiplier: 2,
    anteMin: 2,
    effect: { kind: "start-with-discards", value: 0 },
  },
  {
    id: "the-manacle",
    name: "The Manacle",
    description: "-1 Hand Size.",
    scoreMultiplier: 2,
    anteMin: 1,
    effect: { kind: "hand-size-delta", value: -1 },
  },
  {
    id: "the-psychic",
    name: "The Psychic",
    description: "Must play exactly 5 cards.",
    scoreMultiplier: 2,
    anteMin: 1,
    effect: { kind: "force-card-count", value: 5 },
  },
  {
    id: "the-tooth",
    name: "The Tooth",
    description: "Lose $1 per card played.",
    scoreMultiplier: 2,
    anteMin: 3,
    effect: { kind: "money-per-card-played", value: 1 },
  },
  {
    id: "the-club",
    name: "The Club",
    description: "All Club cards are debuffed.",
    scoreMultiplier: 2,
    anteMin: 1,
    effect: { kind: "debuff-suit", suit: "clubs" },
  },
  {
    id: "the-goad",
    name: "The Goad",
    description: "All Spade cards are debuffed.",
    scoreMultiplier: 2,
    anteMin: 1,
    effect: { kind: "debuff-suit", suit: "spades" },
  },
  {
    id: "the-window",
    name: "The Window",
    description: "All Diamond cards are debuffed.",
    scoreMultiplier: 2,
    anteMin: 1,
    effect: { kind: "debuff-suit", suit: "diamonds" },
  },
  {
    id: "the-head",
    name: "The Head",
    description: "All Heart cards are debuffed.",
    scoreMultiplier: 2,
    anteMin: 1,
    effect: { kind: "debuff-suit", suit: "hearts" },
  },
  {
    id: "the-plant",
    name: "The Plant",
    description: "All face cards are debuffed.",
    scoreMultiplier: 2,
    anteMin: 4,
    effect: { kind: "debuff-face" },
  },
];

export function createBossCatalog(): BossBlind[] {
  return BOSS_SPECS.slice();
}

export function availableBosses(
  catalog: ReadonlyArray<BossBlind>,
  ante: number,
): BossBlind[] {
  return catalog.filter((b) => ante >= b.anteMin);
}

export type BossRandomSource = () => number;

/**
 * Test-only seam: when `localStorage["browslatro:deterministicBoss"]` is
 * `"1"` at module-import time, the picker uses an rng that always returns
 * 0 so Playwright tests can rely on a stable boss for each ante.
 */
const DETERMINISTIC_BOSS_KEY = "browslatro:deterministicBoss";

function readDeterministicBossFlag(): boolean {
  try {
    return window.localStorage.getItem(DETERMINISTIC_BOSS_KEY) === "1";
  } catch {
    return false;
  }
}

export const bossPickerRngConfig: { rng: BossRandomSource } = {
  rng: readDeterministicBossFlag() ? () => 0 : Math.random,
};

export interface PickBossArgs {
  readonly ante: number;
  readonly recentIds?: ReadonlySet<string>;
  readonly catalog?: ReadonlyArray<BossBlind>;
  readonly rng?: BossRandomSource;
}

export function pickBossForAnte(args: PickBossArgs): BossBlind {
  const catalog = args.catalog ?? createBossCatalog();
  const rng = args.rng ?? bossPickerRngConfig.rng;
  const eligible = availableBosses(catalog, args.ante);
  if (eligible.length === 0) {
    throw new Error(`No boss available for ante ${args.ante}`);
  }
  const recent = args.recentIds ?? new Set<string>();
  const fresh = eligible.filter((b) => !recent.has(b.id));
  const pool = fresh.length > 0 ? fresh : eligible;
  return pool[Math.floor(rng() * pool.length)];
}

export const DEFAULT_STARTING_HANDS = 4;
export const DEFAULT_STARTING_DISCARDS = 3;

export function bossStartingHands(boss: BossBlind | null): number {
  if (!boss || boss.effect.kind !== "start-with-hands") {
    return DEFAULT_STARTING_HANDS;
  }
  return boss.effect.value;
}

export function bossStartingDiscards(boss: BossBlind | null): number {
  if (!boss || boss.effect.kind !== "start-with-discards") {
    return DEFAULT_STARTING_DISCARDS;
  }
  return boss.effect.value;
}

export function bossHandSize(
  boss: BossBlind | null,
  baseHandSize: number,
): number {
  if (!boss || boss.effect.kind !== "hand-size-delta") return baseHandSize;
  return Math.max(1, baseHandSize + boss.effect.value);
}

export function bossRequiredCardCount(boss: BossBlind | null): number | null {
  if (!boss || boss.effect.kind !== "force-card-count") return null;
  return boss.effect.value;
}

export function bossMoneyPenaltyPerCard(boss: BossBlind | null): number {
  if (!boss || boss.effect.kind !== "money-per-card-played") return 0;
  return boss.effect.value;
}

export function isCardDebuffedByBoss(
  boss: BossBlind | null,
  card: Card,
): boolean {
  if (!boss) return false;
  switch (boss.effect.kind) {
    case "debuff-suit":
      return card.suit === boss.effect.suit;
    case "debuff-face":
      return FACE_RANKS.has(card.rank);
    default:
      return false;
  }
}

export function debuffedHandIds(
  hand: ReadonlyArray<Card>,
  boss: BossBlind | null,
  isBossRound: boolean,
): ReadonlySet<number> {
  if (!isBossRound || !boss) return new Set();
  return new Set(
    hand.filter((c) => isCardDebuffedByBoss(boss, c)).map((c) => c.id),
  );
}
