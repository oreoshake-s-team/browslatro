import type { Blind, Card, Hand, Rank, Suit } from "../cards/types";
import { cardKey } from "../cards/deck";
import type { HandLabel } from "../scoring/handEvaluator";
import type { HandStatsEntry } from "../scoring/handStats";
import { createPlanetCatalog } from "./planets";

const FACE_RANKS: ReadonlySet<Rank> = new Set(["J", "Q", "K"]);

export type BossEffect =
  | { readonly kind: "none" }
  | { readonly kind: "start-with-hands"; readonly value: number }
  | { readonly kind: "start-with-discards"; readonly value: number }
  | { readonly kind: "hand-size-delta"; readonly value: number }
  | { readonly kind: "force-card-count"; readonly value: number }
  | { readonly kind: "money-per-card-played"; readonly value: number }
  | { readonly kind: "debuff-suit"; readonly suit: Suit }
  | { readonly kind: "debuff-face" }
  | { readonly kind: "single-hand-type" }
  | { readonly kind: "no-repeat-hand-type" }
  | { readonly kind: "debuff-played-this-ante" }
  | { readonly kind: "hand-level-delta"; readonly value: number }
  | {
      readonly kind: "hand-stats-multiplier";
      readonly chipsFactor: number;
      readonly multFactor: number;
    }
  | { readonly kind: "face-down-initial" }
  | { readonly kind: "face-down-on-refill" }
  | { readonly kind: "face-down-chance"; readonly oneIn: number }
  | { readonly kind: "face-down-faces" };

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
    description: "Play 5 cards or score 0.",
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
  {
    id: "the-mouth",
    name: "The Mouth",
    description: "Only one hand type can be played this round.",
    scoreMultiplier: 2,
    anteMin: 2,
    effect: { kind: "single-hand-type" },
  },
  {
    id: "the-eye",
    name: "The Eye",
    description: "No repeated hand types this round.",
    scoreMultiplier: 2,
    anteMin: 3,
    effect: { kind: "no-repeat-hand-type" },
  },
  {
    id: "the-pillar",
    name: "The Pillar",
    description: "Cards played earlier this ante are debuffed.",
    scoreMultiplier: 2,
    anteMin: 1,
    effect: { kind: "debuff-played-this-ante" },
  },
  {
    id: "the-arm",
    name: "The Arm",
    description: "Played poker hand is treated as one level lower.",
    scoreMultiplier: 2,
    anteMin: 2,
    effect: { kind: "hand-level-delta", value: -1 },
  },
  {
    id: "the-flint",
    name: "The Flint",
    description: "Base Chips and Mult for played hands are halved.",
    scoreMultiplier: 2,
    anteMin: 2,
    effect: { kind: "hand-stats-multiplier", chipsFactor: 0.5, multFactor: 0.5 },
  },
  {
    id: "the-house",
    name: "The House",
    description: "First hand is drawn face down.",
    scoreMultiplier: 2,
    anteMin: 2,
    effect: { kind: "face-down-initial" },
  },
  {
    id: "the-fish",
    name: "The Fish",
    description: "Cards drawn face down after each hand played.",
    scoreMultiplier: 2,
    anteMin: 2,
    effect: { kind: "face-down-on-refill" },
  },
  {
    id: "the-wheel",
    name: "The Wheel",
    description: "1 in 7 dealt cards are face down.",
    scoreMultiplier: 2,
    anteMin: 2,
    effect: { kind: "face-down-chance", oneIn: 7 },
  },
  {
    id: "the-mark",
    name: "The Mark",
    description: "All face cards are drawn face down.",
    scoreMultiplier: 2,
    anteMin: 2,
    effect: { kind: "face-down-faces" },
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
  playedCardKeysThisAnte: ReadonlySet<string> = new Set(),
): ReadonlySet<number> {
  if (!isBossRound || !boss) return new Set();
  return new Set(
    hand
      .filter(
        (c) =>
          isCardDebuffedByBoss(boss, c) ||
          (boss.effect.kind === "debuff-played-this-ante" &&
            playedCardKeysThisAnte.has(cardKey(c))),
      )
      .map((c) => c.id),
  );
}

export function bossBlocksHandLabel(
  boss: BossBlind | null,
  label: HandLabel,
  history: ReadonlyArray<HandLabel>,
): boolean {
  if (!boss) return false;
  if (boss.effect.kind === "single-hand-type") {
    return history.length > 0 && history[0] !== label;
  }
  if (boss.effect.kind === "no-repeat-hand-type") {
    return history.includes(label);
  }
  return false;
}

export function canSubmitHand(
  blind: Blind,
  boss: BossBlind | null,
  selectedHand: Hand | null,
  history: ReadonlyArray<HandLabel>,
): boolean {
  if (blind !== 3) return true;
  if (!selectedHand) return true;
  return !bossBlocksHandLabel(boss, selectedHand.label as HandLabel, history);
}

export type FaceDownContext = "initial" | "refill";

export function applyBossFaceDown(
  cards: ReadonlyArray<Card>,
  boss: BossBlind | null,
  isBossRound: boolean,
  context: FaceDownContext,
  rng: () => number = Math.random,
): Card[] {
  if (!isBossRound || !boss) return cards.slice();
  const effect = boss.effect;
  return cards.map((c) => {
    let faceDown = false;
    switch (effect.kind) {
      case "face-down-initial":
        faceDown = context === "initial";
        break;
      case "face-down-on-refill":
        faceDown = context === "refill";
        break;
      case "face-down-chance":
        faceDown = rng() < 1 / effect.oneIn;
        break;
      case "face-down-faces":
        faceDown = FACE_RANKS.has(c.rank);
        break;
      default:
        break;
    }
    return faceDown ? { ...c, faceDown: true } : c;
  });
}

export function bossAdjustHandEntry(
  boss: BossBlind | null,
  label: HandLabel,
  entry: HandStatsEntry,
): HandStatsEntry {
  if (!boss) return entry;
  if (boss.effect.kind === "hand-stats-multiplier") {
    return {
      chips: Math.max(1, Math.floor(entry.chips * boss.effect.chipsFactor)),
      multiplier: Math.max(
        1,
        Math.floor(entry.multiplier * boss.effect.multFactor),
      ),
      level: entry.level,
    };
  }
  if (boss.effect.kind === "hand-level-delta") {
    const delta = boss.effect.value;
    if (delta >= 0 || entry.level <= 1) return entry;
    const planet = createPlanetCatalog().find((p) => p.hands.includes(label));
    if (!planet) return entry;
    return {
      chips: Math.max(1, entry.chips - planet.chipsDelta),
      multiplier: Math.max(1, entry.multiplier - planet.multDelta),
      level: entry.level + delta,
    };
  }
  return entry;
}
