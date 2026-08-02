import type { Card, Rank, Suit } from "../../../cards/types";
import { applyCardEdition } from "../../../cards/editions";
import { applyCardEnhancement, applyLuckyRolls, type LuckyRollResult } from "../../../cards/enhancements";
import { steelHeldMultiplier } from "../../../cards/heldInHand";
import type { Consumable } from "../../consumables";
import { observatoryMultFor, type VoucherId } from "../../vouchers";
import type { HandLabel } from "../../../scoring/handEvaluator";
import type { HandStatsEntry } from "../../../scoring/handStats";
import { getCardChips, getCardMultDelta } from "../../../scoring/scoring";
import type { HandPlayCounts } from "../../../components/hud/handPlayCounts";
import { applyLuckyTriggersToJokerStates } from "../state";
import { heldRetriggerCountFromJokers } from "../collection";
import { applyHandLevelJokers, sequentialMult } from "./handLevel";
import { applyPerCardJokers } from "./perCard";
import { isFaceCard } from "./utils";
import type { Joker, RandomSource } from "../types";
import type { JokerCardStep, JokerHandLevelStep } from "./types";

export interface ComposeHandScoreInput {
  readonly jokers: ReadonlyArray<Joker>;
  readonly scoring: ReadonlyArray<Card>;
  readonly playedCardCount: number;
  readonly label: HandLabel;
  readonly handEntry: HandStatsEntry;
  readonly smearedSuits: boolean;
  readonly rng: RandomSource;
  readonly dealtHand: ReadonlyArray<Card>;
  readonly heldSelection: ReadonlySet<number>;
  readonly heldInHandCards: ReadonlyArray<Card>;
  readonly remainingDiscards: number;
  readonly remainingHands: number;
  readonly money: number;
  readonly fullDeck: ReadonlyArray<Card>;
  readonly remainingDeck: ReadonlyArray<Card>;
  readonly baseDeckSize: number;
  readonly handPlayCounts: HandPlayCounts;
  readonly handLabelsThisRound: ReadonlyArray<HandLabel>;
  readonly blindsSkipped: number;
  readonly addedCardsCount: number;
  readonly todoHand: HandLabel | null;
  readonly bossTriggered: boolean;
  readonly ownedVoucherIds: ReadonlySet<VoucherId>;
  readonly consumables: ReadonlyArray<Consumable>;
  readonly idolTarget: { readonly rank: Rank; readonly suit: Suit } | null;
  readonly ancientSuit: Suit | null;
  readonly computeLuckyRolls?: boolean;
}

export interface ComposeHandScoreResult {
  readonly chips: number;
  readonly mult: number;
  readonly score: number;
  readonly heldSteps: ReadonlyArray<JokerHandLevelStep>;
  readonly jokerSteps: ReadonlyArray<JokerHandLevelStep>;
  readonly cardSteps: ReadonlyArray<JokerCardStep>;
  readonly observatoryMult: number;
  readonly matchingObservatoryPlanets: number;
  readonly luckyRollsByScoringIndex: ReadonlyArray<LuckyRollResult>;
  readonly enhancementXMult: number;
}

function observatoryContext(
  label: HandLabel,
  consumables: ReadonlyArray<Consumable>,
  ownedVoucherIds: ReadonlySet<VoucherId>,
): { readonly matchingObservatoryPlanets: number; readonly observatoryMult: number } {
  const matchingObservatoryPlanets = consumables.filter(
    (c) => c.kind === "planet" && c.card.hands.includes(label),
  ).length;
  return {
    matchingObservatoryPlanets,
    observatoryMult: observatoryMultFor(ownedVoucherIds, matchingObservatoryPlanets),
  };
}

export function composeHandScore(input: ComposeHandScoreInput): ComposeHandScoreResult {
  const { matchingObservatoryPlanets, observatoryMult } = observatoryContext(
    input.label,
    input.consumables,
    input.ownedVoucherIds,
  );

  const handPlayCountsWithThisHand: HandPlayCounts = {
    ...input.handPlayCounts,
    [input.label]: input.handPlayCounts[input.label] + 1,
  };
  const scoringJokers = input.jokers;

  if (input.scoring.length === 0) {
    const handJokerResult = applyHandLevelJokers(scoringJokers, {
      playedHandLabel: input.label,
      playedCardCount: input.playedCardCount,
      scoredCards: [],
      remainingDiscards: input.remainingDiscards,
      remainingHands: input.remainingHands,
      money: input.money,
      rng: input.rng,
      heldInHandCards: input.heldInHandCards,
      fullDeck: input.fullDeck,
      remainingDeck: input.remainingDeck,
      baseDeckSize: input.baseDeckSize,
      handPlayCounts: handPlayCountsWithThisHand,
      handLabelsThisRound: input.handLabelsThisRound,
      blindsSkipped: input.blindsSkipped,
      addedCardsCount: input.addedCardsCount,
      todoHand: input.todoHand,
      bossTriggered: input.bossTriggered,
    });
    const heldSteps = handJokerResult.steps.filter((s) => s.phase === "held");
    const jokerSteps = handJokerResult.steps.filter((s) => s.phase !== "held");
    const chips = input.handEntry.chips + handJokerResult.additiveChips;
    const heldMult = sequentialMult(input.handEntry.multiplier, heldSteps);
    const mult = sequentialMult(heldMult, jokerSteps) * observatoryMult;
    return {
      chips,
      mult,
      score: Math.floor(chips * mult),
      heldSteps,
      jokerSteps,
      cardSteps: [],
      observatoryMult,
      matchingObservatoryPlanets,
      luckyRollsByScoringIndex: [],
      enhancementXMult: 1,
    };
  }

  const cardChipsTotal = input.scoring.reduce(
    (sum, card) => sum + getCardChips(card),
    0,
  );
  let perCardAdditiveMult = 0;
  let perCardAdditiveChips = 0;
  let perCardXMult = 1;
  let firstFaceAlreadyScored = false;
  const luckyRollsByScoringIndex: LuckyRollResult[] = [];
  const cardSteps: JokerCardStep[] = [];
  for (const card of input.scoring) {
    const perCard = applyPerCardJokers(input.jokers, card, input.rng, {
      firstFaceAlreadyScored,
      smearedSuits: input.smearedSuits,
      idolTarget: input.idolTarget,
      ancientSuit: input.ancientSuit,
    });
    cardSteps.push(...perCard.steps);
    perCardAdditiveMult += perCard.additiveMult;
    perCardAdditiveChips += perCard.additiveChips;
    perCardAdditiveMult += getCardMultDelta(card);
    perCardXMult *= perCard.xMult;
    const edition = applyCardEdition(card);
    if (edition !== null) {
      perCardAdditiveChips += edition.additiveChips;
      perCardAdditiveMult += edition.additiveMult;
      perCardXMult *= edition.xMult;
    }
    if (input.computeLuckyRolls === true) {
      const luckyRoll = applyLuckyRolls(card);
      luckyRollsByScoringIndex.push(luckyRoll);
      perCardAdditiveMult += luckyRoll.multBonus;
    }
    if (isFaceCard(card)) firstFaceAlreadyScored = true;
  }

  const luckyTriggerCount = luckyRollsByScoringIndex.reduce(
    (sum, roll) =>
      sum + (roll.multBonus > 0 ? 1 : 0) + (roll.moneyBonus > 0 ? 1 : 0),
    0,
  );
  const handJokerResult = applyHandLevelJokers(
    applyLuckyTriggersToJokerStates(scoringJokers, luckyTriggerCount),
    {
      playedHandLabel: input.label,
      playedCardCount: input.playedCardCount,
      scoredCards: input.scoring,
      remainingDiscards: input.remainingDiscards,
      remainingHands: input.remainingHands,
      money: input.money,
      rng: input.rng,
      heldInHandCards: input.heldInHandCards,
      fullDeck: input.fullDeck,
      remainingDeck: input.remainingDeck,
      baseDeckSize: input.baseDeckSize,
      handPlayCounts: handPlayCountsWithThisHand,
      handLabelsThisRound: input.handLabelsThisRound,
      blindsSkipped: input.blindsSkipped,
      addedCardsCount: input.addedCardsCount,
      todoHand: input.todoHand,
      bossTriggered: input.bossTriggered,
    },
  );

  const steelMult = steelHeldMultiplier(
    input.dealtHand,
    input.heldSelection,
    heldRetriggerCountFromJokers(input.jokers),
  );
  const enhancementXMult = input.scoring.reduce(
    (m, card) => m * applyCardEnhancement(card).multTimes,
    1,
  );
  const cardMult =
    (input.handEntry.multiplier + perCardAdditiveMult) *
    enhancementXMult *
    perCardXMult;
  const heldSteps = handJokerResult.steps.filter((s) => s.phase === "held");
  const jokerSteps = handJokerResult.steps.filter((s) => s.phase !== "held");
  const heldMult = sequentialMult(cardMult * steelMult, heldSteps);

  const chips =
    input.handEntry.chips +
    cardChipsTotal +
    handJokerResult.additiveChips +
    perCardAdditiveChips;
  const mult = sequentialMult(heldMult, jokerSteps) * observatoryMult;

  return {
    chips,
    mult,
    score: Math.floor(chips * mult),
    heldSteps,
    jokerSteps,
    cardSteps,
    observatoryMult,
    matchingObservatoryPlanets,
    luckyRollsByScoringIndex,
    enhancementXMult,
  };
}
