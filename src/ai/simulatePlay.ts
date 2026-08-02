import { fullDeckPile } from "../cards/deckBuild";
import { getHeldInHand } from "../cards/heldInHand";
import type {
  Blind,
  Card,
  Enhancement,
  Rank,
  Seal,
  Suit,
} from "../cards/types";
import type { Consumable } from "../items/consumables";
import {
  bossAdjustHandEntry,
  bossRequiredCardCount,
  bossVoidsHandLabel,
  debuffedHandIds,
  type BossBlind,
} from "../items/bosses";
import {
  advanceStackGainsForScoring,
  allCardsScoreFromJokers,
  applyScoredCardMutations,
  applyScoredMutationsToCards,
  expandScoringRetriggers,
  handEvalOptionsFromJokers,
} from "../items/jokers";
import { composeHandScore } from "../items/jokers/scoring/composeHandScore";
import type { Joker, RandomSource } from "../items/jokers/types";
import { chooseOptimalJokerOrder } from "../items/jokers/jokerOrdering";
import type { VoucherId } from "../items/vouchers";
import type { HandPlayCounts } from "../components/hud/handPlayCounts";
import { detectHandLabel, type HandLabel } from "../scoring/handEvaluator";
import { getScoringCards } from "../scoring/scoring";
import type { HandStats } from "../scoring/handStats";

export const MAX_PLAYED_CARDS = 5;

export interface SimulatePlayInput {
  readonly dealt: {
    readonly hand: ReadonlyArray<Card>;
    readonly remaining: ReadonlyArray<Card>;
  };
  readonly baseDeckCards: ReadonlyArray<Card>;
  readonly destroyedCardIds: ReadonlySet<number>;
  readonly addedCards: ReadonlyArray<Card>;
  readonly cardEnhancementsById: ReadonlyMap<number, Enhancement | null>;
  readonly cardSealsById: ReadonlyMap<number, Seal>;
  readonly jokers: ReadonlyArray<Joker>;
  readonly handStats: HandStats;
  readonly handPlayCounts: HandPlayCounts;
  readonly handHistoryThisRound: ReadonlyArray<HandLabel>;
  readonly playedCardKeysThisAnte: ReadonlySet<string>;
  readonly consumables: ReadonlyArray<Consumable>;
  readonly ownedVoucherIds: ReadonlySet<VoucherId>;
  readonly blind: Blind;
  readonly currentBoss: BossBlind;
  readonly money: number;
  readonly remainingHands: number;
  readonly remainingDiscards: number;
  readonly runStats: { readonly blindsSkipped: number };
  readonly todoHand: HandLabel | null;
  readonly idolTarget: { readonly rank: Rank; readonly suit: Suit } | null;
  readonly ancientSuit: Suit | null;
  readonly optimizeJokerOrder?: boolean;
  readonly rng?: RandomSource;
}

export type IllegalPlayReason =
  | "empty-selection"
  | "too-many-cards"
  | "card-not-in-hand";

export type SimulatePlayResult =
  | { readonly legal: false; readonly reason: IllegalPlayReason }
  | {
      readonly legal: true;
      readonly handLabel: HandLabel;
      readonly score: number;
      readonly chips: number;
      readonly mult: number;
      readonly scoringCardIds: ReadonlyArray<number>;
      readonly bossTriggered: boolean;
    };

const neverProc: RandomSource = () => 1;

function sameJokerOrder(
  a: ReadonlyArray<Joker>,
  b: ReadonlyArray<Joker>,
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function simulatePlay(
  input: SimulatePlayInput,
  cardIds: ReadonlyArray<number>,
): SimulatePlayResult {
  if (input.optimizeJokerOrder !== true) return scorePlay(input, cardIds);
  const baseline = scorePlay(input, cardIds);
  if (!baseline.legal) return baseline;
  const order = chooseOptimalJokerOrder(input.jokers, (perm) => {
    const result = scorePlay({ ...input, jokers: perm }, cardIds);
    return result.legal ? result.score : Number.NEGATIVE_INFINITY;
  });
  if (sameJokerOrder(order, input.jokers)) return baseline;
  return scorePlay({ ...input, jokers: order }, cardIds);
}

function scorePlay(
  input: SimulatePlayInput,
  cardIds: ReadonlyArray<number>,
): SimulatePlayResult {
  if (cardIds.length === 0) return { legal: false, reason: "empty-selection" };
  if (cardIds.length > MAX_PLAYED_CARDS) {
    return { legal: false, reason: "too-many-cards" };
  }
  const handById = new Map(input.dealt.hand.map((c) => [c.id, c]));
  const playedCards: Card[] = [];
  for (const id of cardIds) {
    const card = handById.get(id);
    if (card === undefined) return { legal: false, reason: "card-not-in-hand" };
    playedCards.push(card);
  }

  const evalOptions = handEvalOptionsFromJokers(input.jokers);
  const label = detectHandLabel(playedCards, evalOptions);
  const isBossRound = input.blind === 3;
  if (
    isBossRound &&
    bossVoidsHandLabel(input.currentBoss, label, input.handHistoryThisRound)
  ) {
    return {
      legal: true,
      handLabel: label,
      score: 0,
      chips: 0,
      mult: 0,
      scoringCardIds: [],
      bossTriggered: true,
    };
  }

  const baseHandEntry = input.handStats[label];
  const adjustedHandEntry = isBossRound
    ? bossAdjustHandEntry(input.currentBoss, label, baseHandEntry)
    : baseHandEntry;
  const forcedCount = isBossRound
    ? bossRequiredCardCount(input.currentBoss)
    : null;
  const psychicZeroed =
    forcedCount !== null && playedCards.length !== forcedCount;
  const handEntry = psychicZeroed
    ? { ...adjustedHandEntry, chips: 0, multiplier: 0 }
    : adjustedHandEntry;
  const playedDebuffedIds = debuffedHandIds(
    playedCards,
    input.currentBoss,
    isBossRound,
    input.playedCardKeysThisAnte,
  );
  const bossTriggered =
    isBossRound &&
    (playedDebuffedIds.size > 0 ||
      psychicZeroed ||
      adjustedHandEntry !== baseHandEntry);

  const preMutationScoring = expandScoringRetriggers(
    getScoringCards(playedCards, label, {
      allCardsScore: allCardsScoreFromJokers(input.jokers),
      evalOptions,
    }),
    input.jokers,
    { remainingHands: input.remainingHands },
  ).filter((c) => !playedDebuffedIds.has(c.id));
  const mutations = applyScoredCardMutations(input.jokers, preMutationScoring);
  const scoring =
    mutations.enhancementChanges.size > 0
      ? applyScoredMutationsToCards(
          preMutationScoring,
          mutations.enhancementChanges,
        )
      : preMutationScoring;

  const rng = input.rng ?? neverProc;
  const scoringJokers = advanceStackGainsForScoring(input.jokers, {
    playedHandLabel: label,
    playedCardCount: playedCards.length,
    scoredCards: scoring,
    handPlayCounts: input.handPlayCounts,
  });
  const selection: ReadonlySet<number> = new Set(cardIds);
  const result = composeHandScore({
    jokers: scoringJokers,
    scoring,
    playedCardCount: playedCards.length,
    label,
    handEntry,
    smearedSuits: evalOptions.smearedSuits === true,
    rng,
    dealtHand: input.dealt.hand,
    heldSelection: selection,
    heldInHandCards: getHeldInHand(input.dealt.hand, selection),
    remainingDiscards: input.remainingDiscards,
    remainingHands: input.remainingHands,
    money: input.money,
    fullDeck:
      input.jokers.length === 0
        ? []
        : fullDeckPile(
            input.baseDeckCards,
            input.destroyedCardIds,
            input.addedCards,
            input.cardEnhancementsById,
            input.cardSealsById,
          ).remaining,
    remainingDeck: input.dealt.remaining,
    baseDeckSize: input.baseDeckCards.length,
    handPlayCounts: input.handPlayCounts,
    handLabelsThisRound: input.handHistoryThisRound,
    blindsSkipped: input.runStats.blindsSkipped,
    addedCardsCount: input.addedCards.length,
    todoHand: input.todoHand,
    bossTriggered,
    ownedVoucherIds: input.ownedVoucherIds,
    consumables: input.consumables,
    idolTarget: input.idolTarget,
    ancientSuit: input.ancientSuit,
  });

  return {
    legal: true,
    handLabel: label,
    score: result.score,
    chips: result.chips,
    mult: result.mult,
    scoringCardIds: scoring.map((c) => c.id),
    bossTriggered,
  };
}
