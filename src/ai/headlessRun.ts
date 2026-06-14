import { cardKey, deal, shuffle, HAND_SIZE } from "../cards/deck";
import type {
  Blind,
  Card,
  CardEdition,
  Enhancement,
  Rank,
  Seal,
  Suit,
} from "../cards/types";
import { FINAL_ANTE } from "../constants";
import { pickBossForAnte } from "../items/bosses";
import { DEFAULT_DECK, deckStartingMoneyDelta, type Deck } from "../items/decks";
import { interestMultiplierFromJokers } from "../items/jokers/collection";
import type { Joker, RandomSource } from "../items/jokers/types";
import { DEFAULT_STAKE, type Stake } from "../items/stakes";
import {
  resolveTagEffect,
  rollSkipTag,
  type TagId,
} from "../items/tags";
import { interestCapFor, type VoucherId } from "../items/vouchers";
import { immediateMoneyGain } from "../run/immediateActions";
import {
  initialRunStats,
  recordBlindSkipped,
  recordHandPlayed,
  recordUnusedDiscards,
  type RunStats,
} from "../run/runStats";
import { emptyHandCounts } from "../components/hud/handPlayCounts";
import { requiredChipsForBlind } from "../scoring/anteScaling";
import type { HandLabel } from "../scoring/handEvaluator";
import { createDefaultHandStats, type HandStats } from "../scoring/handStats";
import { calculateInterest, REMAINING_HAND_BONUS } from "../scoring/payout";
import {
  computeStartingDiscards,
  computeStartingHands,
} from "../run/roundSetup";
import { simulatePlay, type SimulatePlayInput } from "./simulatePlay";

export function seededRng(seed: number): RandomSource {
  let a = seed >>> 0;
  return (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SUITS: ReadonlyArray<Suit> = ["spades", "hearts", "diamonds", "clubs"];
const RANKS: ReadonlyArray<Rank> = [
  "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A",
];

export function buildHeadlessDeck(): Card[] {
  const cards: Card[] = [];
  let id = 0;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ id: ++id, rank, suit });
    }
  }
  return cards;
}

export type AgentAction =
  | { readonly kind: "play"; readonly cardIds: ReadonlyArray<number> }
  | { readonly kind: "discard"; readonly cardIds: ReadonlyArray<number> }
  | { readonly kind: "skip" };

export interface HeadlessRoundView extends SimulatePlayInput {
  readonly ante: number;
  readonly round: number;
  readonly selectedStake: Stake;
  readonly roundScore: number;
  readonly scoreTarget: number;
  readonly offeredTag: TagId | null;
}

export interface HeadlessAgent {
  readonly name: string;
  chooseAction(view: HeadlessRoundView): AgentAction | Promise<AgentAction>;
}

export interface ShopView {
  readonly ante: number;
  readonly round: number;
  readonly money: number;
  readonly jokers: ReadonlyArray<Joker>;
  readonly handStats: HandStats;
  readonly ownedVoucherIds: ReadonlySet<VoucherId>;
  readonly rng: RandomSource;
}

export interface ShopResult {
  readonly jokers: ReadonlyArray<Joker>;
  readonly money: number;
  readonly handStats: HandStats;
  readonly ownedVoucherIds?: ReadonlySet<VoucherId>;
}

export interface HeadlessShopAgent {
  buyAfterRound(view: ShopView): Promise<ShopResult>;
}

export interface HeadlessRunConfig {
  readonly seed: number;
  readonly maxAnte?: number;
  readonly jokers?: ReadonlyArray<Joker>;
  readonly stake?: Stake;
  readonly deck?: Deck;
  readonly shopAgent?: HeadlessShopAgent;
  readonly startAnte?: number;
  readonly startHandStats?: HandStats;
  readonly startMoney?: number;
  readonly maxRounds?: number;
  readonly startCardEnhancements?: ReadonlyMap<number, Enhancement | null>;
  readonly startCardSeals?: ReadonlyMap<number, Seal>;
  readonly startCardBonusChips?: ReadonlyMap<number, number>;
  readonly startCardEditions?: ReadonlyMap<number, CardEdition>;
}

export interface HeadlessRunResult {
  readonly won: boolean;
  readonly anteReached: number;
  readonly blindsCleared: number;
  readonly handsPlayed: number;
  readonly blindsSkipped: number;
}

const STARTING_MONEY = 4;
const BLIND_CLEAR_REWARD_BASE = 2;
const MAX_DISCARD_SIZE = 5;

export interface Pile {
  readonly hand: ReadonlyArray<Card>;
  readonly remaining: ReadonlyArray<Card>;
}

export function removeAndRefill(
  pile: Pile,
  cardIds: ReadonlyArray<number>,
): Pile {
  const removed = new Set(cardIds);
  const kept = pile.hand.filter((c) => !removed.has(c.id));
  const drawCount = Math.min(
    pile.hand.length - kept.length,
    pile.remaining.length,
  );
  return {
    hand: [...kept, ...pile.remaining.slice(0, drawCount)],
    remaining: pile.remaining.slice(drawCount),
  };
}

const SKIPPED = -2;

interface CardModifierMaps {
  readonly enhancements?: ReadonlyMap<number, Enhancement | null>;
  readonly seals?: ReadonlyMap<number, Seal>;
  readonly bonusChips?: ReadonlyMap<number, number>;
  readonly editions?: ReadonlyMap<number, CardEdition>;
}

function applyCardModifiers(
  deck: ReadonlyArray<Card>,
  mods: CardModifierMaps,
): Card[] {
  const maps = [mods.enhancements, mods.seals, mods.bonusChips, mods.editions];
  if (maps.every((m) => m === undefined || m.size === 0)) {
    return [...deck];
  }
  return deck.map((card) => ({
    ...card,
    ...(mods.enhancements?.has(card.id)
      ? { enhancement: mods.enhancements.get(card.id) }
      : {}),
    ...(mods.seals?.has(card.id) ? { seal: mods.seals.get(card.id) } : {}),
    ...(mods.bonusChips?.has(card.id)
      ? { bonusChips: mods.bonusChips.get(card.id) }
      : {}),
    ...(mods.editions?.has(card.id)
      ? { edition: mods.editions.get(card.id) }
      : {}),
  }));
}

export function grantTagMoney(tagId: TagId, stats: RunStats, money: number): number {
  const effect = resolveTagEffect(tagId);
  if (effect.category !== "immediate") return 0;
  const action = effect.action;
  if (
    action.kind === "open-pack" ||
    action.kind === "create-jokers" ||
    action.kind === "reroll-boss" ||
    action.kind === "upgrade-hand"
  ) {
    return 0;
  }
  return immediateMoneyGain(action, { stats, money });
}

export async function playHeadlessRun(
  agent: HeadlessAgent,
  config: HeadlessRunConfig,
): Promise<HeadlessRunResult> {
  const rng = seededRng(config.seed);
  const tagRng = seededRng(config.seed + 0x9e3779b9);
  const maxAnte = config.maxAnte ?? FINAL_ANTE;
  const startAnte = config.startAnte ?? 1;
  const roundBudget = config.maxRounds ?? Infinity;
  let jokers: ReadonlyArray<Joker> = config.jokers ?? [];
  const stake = config.stake ?? DEFAULT_STAKE;
  const deckId = config.deck ?? DEFAULT_DECK;
  const deck = applyCardModifiers(buildHeadlessDeck(), {
    enhancements: config.startCardEnhancements,
    seals: config.startCardSeals,
    editions: config.startCardEditions,
    bonusChips: config.startCardBonusChips,
  });
  let handStats = config.startHandStats ?? createDefaultHandStats();
  let ownedVoucherIds: ReadonlySet<VoucherId> = new Set();
  const recentBossIds = new Set<string>();

  let money =
    config.startMoney ?? STARTING_MONEY + deckStartingMoneyDelta(deckId);
  let blindsCleared = 0;
  let handsPlayed = 0;
  let runStats: RunStats = initialRunStats();
  let handPlayCounts = emptyHandCounts();

  for (let ante = startAnte; ante <= maxAnte; ante += 1) {
    const boss = pickBossForAnte({ ante, rng, recentIds: recentBossIds });
    recentBossIds.add(boss.id);
    const playedCardKeysThisAnte = new Set<string>();

    const playRound = async (
      blind: Blind,
      offeredTag: TagId | null,
    ): Promise<number> => {
      const startCtx = {
        blind,
        boss,
        ownedVoucherIds,
        deck: deckId,
        jokers,
        stake,
      };
      let remainingHands = computeStartingHands(startCtx);
      let remainingDiscards = computeStartingDiscards(startCtx);
      const scoreTarget = requiredChipsForBlind({ ante, blind, boss, stake });
      let pile: Pile = deal(shuffle(deck, rng), HAND_SIZE);
      let roundScore = 0;
      let firstAction = true;
      const handHistoryThisRound: HandLabel[] = [];

      while (remainingHands > 0) {
        if (pile.hand.length === 0) return -1;
        const view: HeadlessRoundView = {
          dealt: pile,
          baseDeckCards: deck,
          destroyedCardIds: new Set(),
          addedCards: [],
          cardEnhancementsById: new Map(),
          cardSealsById: new Map(),
          jokers,
          handStats,
          handPlayCounts,
          handHistoryThisRound,
          playedCardKeysThisAnte,
          consumables: [],
          ownedVoucherIds,
          blind,
          currentBoss: boss,
          money,
          remainingHands,
          remainingDiscards,
          runStats: { blindsSkipped: runStats.blindsSkipped },
          todoHand: null,
          idolTarget: null,
          ancientSuit: null,
          ante,
          round: blindsCleared + 1,
          selectedStake: stake,
          roundScore,
          scoreTarget,
          offeredTag: firstAction ? offeredTag : null,
        };
        const action = await agent.chooseAction(view);
        if (action.kind === "skip") {
          if (firstAction && offeredTag !== null) return SKIPPED;
          throw new Error(`${agent.name} skipped after the blind began`);
        }
        firstAction = false;
        if (action.kind === "discard") {
          if (remainingDiscards <= 0) {
            throw new Error(`${agent.name} discarded with none remaining`);
          }
          if (
            action.cardIds.length === 0 ||
            action.cardIds.length > MAX_DISCARD_SIZE
          ) {
            throw new Error(
              `${agent.name} discarded ${action.cardIds.length} cards`,
            );
          }
          remainingDiscards -= 1;
          pile = removeAndRefill(pile, action.cardIds);
          continue;
        }
        const result = simulatePlay(view, action.cardIds);
        if (!result.legal) {
          throw new Error(
            `${agent.name} made an illegal play: ${result.reason}`,
          );
        }
        handsPlayed += 1;
        runStats = recordHandPlayed(runStats);
        roundScore += result.score;
        handPlayCounts = {
          ...handPlayCounts,
          [result.handLabel]: handPlayCounts[result.handLabel] + 1,
        };
        handHistoryThisRound.push(result.handLabel);
        for (const id of action.cardIds) {
          const played = pile.hand.find((c) => c.id === id);
          if (played !== undefined) {
            playedCardKeysThisAnte.add(cardKey(played));
          }
        }
        if (roundScore >= scoreTarget) {
          runStats = recordUnusedDiscards(runStats, remainingDiscards);
          return remainingHands - 1;
        }
        remainingHands -= 1;
        pile = removeAndRefill(pile, action.cardIds);
      }
      return -1;
    };

    for (const blind of [1, 2, 3] as const) {
      const offeredTag: TagId | null = blind === 3 ? null : rollSkipTag(tagRng);
      const unusedHands = await playRound(blind, offeredTag);
      if (unusedHands === SKIPPED && offeredTag !== null) {
        runStats = recordBlindSkipped(runStats);
        money += grantTagMoney(offeredTag, runStats, money);
        if (blindsCleared >= roundBudget) {
          return { won: false, anteReached: ante, blindsCleared, handsPlayed, blindsSkipped: runStats.blindsSkipped };
        }
        continue;
      }
      if (unusedHands < 0) {
        return { won: false, anteReached: ante, blindsCleared, handsPlayed, blindsSkipped: runStats.blindsSkipped };
      }
      blindsCleared += 1;
      const interest =
        calculateInterest(money, interestCapFor(ownedVoucherIds)) *
        interestMultiplierFromJokers(jokers);
      money +=
        blind +
        BLIND_CLEAR_REWARD_BASE +
        interest +
        REMAINING_HAND_BONUS * unusedHands;
      if (blindsCleared >= roundBudget) {
        return { won: false, anteReached: ante, blindsCleared, handsPlayed, blindsSkipped: runStats.blindsSkipped };
      }
      if (config.shopAgent !== undefined) {
        const result = await config.shopAgent.buyAfterRound({ ante, round: blindsCleared, money, jokers, handStats, ownedVoucherIds, rng });
        jokers = result.jokers;
        money = result.money;
        handStats = result.handStats;
        ownedVoucherIds = result.ownedVoucherIds ?? ownedVoucherIds;
      }
    }
  }
  return { won: true, anteReached: maxAnte, blindsCleared, handsPlayed, blindsSkipped: runStats.blindsSkipped };
}
