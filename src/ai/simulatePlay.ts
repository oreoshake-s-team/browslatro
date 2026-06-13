import { applyCardEnhancement } from "../cards/enhancements";
import { fullDeckPile } from "../cards/deckBuild";
import { getHeldInHand, steelHeldMultiplier } from "../cards/heldInHand";
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
  applyHandLevelJokers,
  applyPerCardJokers,
  applyScoredCardMutations,
  applyScoredMutationsToCards,
  expandScoringRetriggers,
  handEvalOptionsFromJokers,
  heldRetriggerCountFromJokers,
  isFaceCard,
} from "../items/jokers";
import type { Joker, RandomSource } from "../items/jokers/types";
import { observatoryMultFor, type VoucherId } from "../items/vouchers";
import type { HandPlayCounts } from "../components/hud/handPlayCounts";
import { detectHandLabel, type HandLabel } from "../scoring/handEvaluator";
import {
  getCardChips,
  getCardMultDelta,
  getScoringCards,
} from "../scoring/scoring";
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

export function simulatePlay(
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

  const handPlayCountsWithThisHand: HandPlayCounts = {
    ...input.handPlayCounts,
    [label]: input.handPlayCounts[label] + 1,
  };
  const scoringJokers = advanceStackGainsForScoring(input.jokers, {
    playedHandLabel: label,
    playedCardCount: playedCards.length,
    scoredCards: scoring,
  });
  const handJokerResult = applyHandLevelJokers(scoringJokers, {
    playedHandLabel: label,
    playedCardCount: playedCards.length,
    scoredCards: scoring,
    remainingDiscards: input.remainingDiscards,
    remainingHands: input.remainingHands,
    money: input.money,
    heldInHandCards: getHeldInHand(input.dealt.hand, new Set(cardIds)),
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
    handPlayCounts: handPlayCountsWithThisHand,
    handLabelsThisRound: input.handHistoryThisRound,
    blindsSkipped: input.runStats.blindsSkipped,
    addedCardsCount: input.addedCards.length,
    todoHand: input.todoHand,
    bossTriggered,
  });

  const matchingObservatoryPlanets = input.consumables.filter(
    (c) => c.kind === "planet" && c.card.hands.includes(label),
  ).length;
  const observatoryMult = observatoryMultFor(
    input.ownedVoucherIds,
    matchingObservatoryPlanets,
  );

  if (scoring.length === 0) {
    const chips = handEntry.chips + handJokerResult.additiveChips;
    const mult =
      (handEntry.multiplier + handJokerResult.additiveMult) *
      handJokerResult.xMult *
      observatoryMult;
    return {
      legal: true,
      handLabel: label,
      score: Math.floor(chips * mult),
      chips,
      mult,
      scoringCardIds: [],
      bossTriggered,
    };
  }

  const cardChipsTotal = scoring.reduce(
    (sum, card) => sum + getCardChips(card),
    0,
  );
  let perCardAdditiveMult = 0;
  let perCardAdditiveChips = 0;
  let perCardXMult = 1;
  let firstFaceAlreadyScored = false;
  const smearedSuits = evalOptions.smearedSuits === true;
  for (const card of scoring) {
    const perCard = applyPerCardJokers(input.jokers, card, neverProc, {
      firstFaceAlreadyScored,
      smearedSuits,
      idolTarget: input.idolTarget,
      ancientSuit: input.ancientSuit,
    });
    perCardAdditiveMult += perCard.additiveMult;
    perCardAdditiveChips += perCard.additiveChips;
    perCardAdditiveMult += getCardMultDelta(card);
    perCardXMult *= perCard.xMult;
    if (isFaceCard(card)) firstFaceAlreadyScored = true;
  }

  const selection: ReadonlySet<number> = new Set(cardIds);
  const steelMult = steelHeldMultiplier(
    input.dealt.hand,
    selection,
    heldRetriggerCountFromJokers(input.jokers),
  );
  const enhancementXMult = scoring.reduce(
    (m, card) => m * applyCardEnhancement(card).multTimes,
    1,
  );
  const totalXMult =
    handJokerResult.xMult *
    enhancementXMult *
    perCardXMult *
    steelMult *
    observatoryMult;

  const chips =
    handEntry.chips +
    cardChipsTotal +
    handJokerResult.additiveChips +
    perCardAdditiveChips;
  const mult =
    (handEntry.multiplier +
      handJokerResult.additiveMult +
      perCardAdditiveMult) *
    totalXMult;
  return {
    legal: true,
    handLabel: label,
    score: Math.floor(chips * mult),
    chips,
    mult,
    scoringCardIds: scoring.map((c) => c.id),
    bossTriggered,
  };
}
