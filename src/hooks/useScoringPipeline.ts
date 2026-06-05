import { useRef, type MutableRefObject } from "react";
import { useGame } from "../store/game";
import { useScoringStepSequence } from "./useScoringStepSequence";
import { play } from "../components/system/sounds";
import {
  getRankChips,
  getScoringStep,
} from "../scoring/scoring";
import { cardLabel, type ScoringEvent } from "../scoring/scoringTrace";
import {
  applyCardEnhancement,
  cardRankForEvaluation,
  rollEnhancementChance,
} from "../cards/enhancements";
import { goldSealMoney } from "../cards/seals";
import { applyPerCardJokers, isFaceCard } from "../items/jokers";
import { CARD_EDITION_INFO, applyCardEdition } from "../cards/editions";
import { GOLD_HELD_BONUS_PER_CARD } from "../scoring/payout";
import { STEEL_MULT_FACTOR } from "../cards/heldInHand";

type FinalizeRef = MutableRefObject<(() => void) | null>;

export interface UseScoringPipelineParams {
  readonly stepMs: number;
}

export interface UseScoringPipelineResult {
  readonly isScoring: boolean;
  readonly currentScoringId: number | null;
  readonly currentGoldScoringId: number | null;
  readonly currentSteelScoringId: number | null;
  readonly scoringFinalizeRef: FinalizeRef;
  readonly goldFinalizeRef: FinalizeRef;
  readonly steelFinalizeRef: FinalizeRef;
  readonly handLevelFinalizeRef: FinalizeRef;
  readonly resetScoring: () => void;
}

export function useScoringPipeline({
  stepMs,
}: UseScoringPipelineParams): UseScoringPipelineResult {
  const scoringFinalizeRef = useRef<(() => void) | null>(null);
  const goldFinalizeRef = useRef<(() => void) | null>(null);
  const steelFinalizeRef = useRef<(() => void) | null>(null);
  const handLevelFinalizeRef = useRef<(() => void) | null>(null);

  const scoringCards = useGame((s) => s.scoringCards);
  const setScoringCards = useGame((s) => s.setScoringCards);
  const scoringIndex = useGame((s) => s.scoringIndex);
  const setScoringIndex = useGame((s) => s.setScoringIndex);

  const goldScoringIds = useGame((s) => s.goldScoringIds);
  const setGoldScoringIds = useGame((s) => s.setGoldScoringIds);
  const goldScoringIndex = useGame((s) => s.goldScoringIndex);
  const setGoldScoringIndex = useGame((s) => s.setGoldScoringIndex);

  const steelScoringIds = useGame((s) => s.steelScoringIds);
  const setSteelScoringIds = useGame((s) => s.setSteelScoringIds);
  const steelScoringIndex = useGame((s) => s.steelScoringIndex);
  const setSteelScoringIndex = useGame((s) => s.setSteelScoringIndex);

  const handLevelSteps = useGame((s) => s.handLevelSteps);
  const setHandLevelSteps = useGame((s) => s.setHandLevelSteps);
  const handLevelIndex = useGame((s) => s.handLevelIndex);
  const setHandLevelIndex = useGame((s) => s.setHandLevelIndex);

  const setChips = useGame((s) => s.setChips);
  const setMultiplier = useGame((s) => s.setMultiplier);
  const setScoringEvents = useGame((s) => s.setScoringEvents);
  const setLuckyMultProcIds = useGame((s) => s.setLuckyMultProcIds);
  const setLuckyMoneyProcIds = useGame((s) => s.setLuckyMoneyProcIds);
  const setDestroyedCardIds = useGame((s) => s.setDestroyedCardIds);
  const setJokerPulseCounters = useGame((s) => s.setJokerPulseCounters);
  const jokers = useGame((s) => s.jokers);
  const dealt = useGame((s) => s.dealt);

  const isScoring =
    scoringCards.length > 0 && scoringIndex < scoringCards.length;
  const currentScoringId = isScoring ? scoringCards[scoringIndex].id : null;
  const currentGoldScoringId =
    goldScoringIds.length > 0 && goldScoringIndex < goldScoringIds.length
      ? goldScoringIds[goldScoringIndex]
      : null;
  const currentSteelScoringId =
    steelScoringIds.length > 0 && steelScoringIndex < steelScoringIds.length
      ? steelScoringIds[steelScoringIndex]
      : null;

  function pushScoringEvent(event: ScoringEvent) {
    setScoringEvents((prev) => [...prev, event]);
  }

  function pulseJokers(firedIds: ReadonlyArray<string>) {
    if (firedIds.length === 0) return;
    setJokerPulseCounters((prev) => {
      const next = { ...prev };
      for (const id of firedIds) {
        next[id] = (next[id] ?? 0) + 1;
      }
      return next;
    });
  }

  useScoringStepSequence({
    items: scoringCards,
    index: scoringIndex,
    setIndex: setScoringIndex,
    stepMs,
    onStep: (_card, stepIdx) => {
      const { card: stepCard, chips: stepChips } = getScoringStep(
        scoringCards,
        stepIdx,
      );
      setChips((prev) => prev + stepChips);
      const stepCardLabel = cardLabel(stepCard);
      const evalRank = cardRankForEvaluation(stepCard);
      const rankChips = evalRank === null ? 0 : getRankChips(evalRank);
      if (rankChips > 0) {
        pushScoringEvent({
          kind: "chips-delta",
          amount: rankChips,
          source: `${stepCardLabel} rank`,
        });
      }
      play("pop");
      const enhancementEffect = applyCardEnhancement(stepCard);
      if (enhancementEffect.chipsDelta > 0) {
        const enhancementChipsSource =
          stepCard.enhancement === "stone"
            ? `Stone on ${stepCardLabel}`
            : `Bonus on ${stepCardLabel}`;
        pushScoringEvent({
          kind: "chips-delta",
          amount: enhancementEffect.chipsDelta,
          source: enhancementChipsSource,
        });
      }
      if (enhancementEffect.multDelta > 0) {
        setMultiplier((prev) => prev + enhancementEffect.multDelta);
        pushScoringEvent({
          kind: "mult-delta",
          amount: enhancementEffect.multDelta,
          source: `Mult on ${stepCardLabel}`,
        });
      }
      if (enhancementEffect.multTimes !== 1) {
        setMultiplier((prev) => prev * enhancementEffect.multTimes);
        pushScoringEvent({
          kind: "mult-times",
          factor: enhancementEffect.multTimes,
          source: `Glass on ${stepCardLabel}`,
        });
      }
      if (rollEnhancementChance(enhancementEffect.destroyChance)) {
        const id = stepCard.id;
        setDestroyedCardIds((prev) => {
          if (prev.has(id)) return prev;
          const next = new Set(prev);
          next.add(id);
          return next;
        });
        pushScoringEvent({
          kind: "card-destroyed",
          cardLabel: stepCardLabel,
          source: "Glass roll",
        });
      }
      const luckyResult = useGame.getState().luckyRollsByScoringIndex[stepIdx] ?? {
        multBonus: 0,
        moneyBonus: 0,
      };
      if (luckyResult.multBonus > 0) {
        setMultiplier((prev) => prev + luckyResult.multBonus);
        pushScoringEvent({
          kind: "mult-delta",
          amount: luckyResult.multBonus,
          source: `Lucky proc on ${stepCardLabel}`,
        });
        setLuckyMultProcIds((prev) => {
          const next = new Set(prev);
          next.add(stepCard.id);
          return next;
        });
      }
      if (luckyResult.moneyBonus > 0) {
        useGame.getState().earn(luckyResult.moneyBonus);
        pushScoringEvent({
          kind: "money-delta",
          amount: luckyResult.moneyBonus,
          source: `Lucky money proc on ${stepCardLabel}`,
        });
        setLuckyMoneyProcIds((prev) => {
          const next = new Set(prev);
          next.add(stepCard.id);
          return next;
        });
      }
      const sealMoney = goldSealMoney(stepCard);
      if (sealMoney > 0) {
        useGame.getState().earn(sealMoney);
        pushScoringEvent({
          kind: "money-delta",
          amount: sealMoney,
          source: `Gold Seal on ${stepCardLabel}`,
        });
      }
      const firstFaceAlreadyScored = scoringCards
        .slice(0, stepIdx)
        .some(isFaceCard);
      const cardJokerResult = applyPerCardJokers(
        jokers,
        stepCard,
        Math.random,
        { firstFaceAlreadyScored },
      );
      if (cardJokerResult.moneyEarned > 0) {
        useGame.getState().earn(cardJokerResult.moneyEarned);
      }
      if (cardJokerResult.additiveMult > 0) {
        setMultiplier((prev) => prev + cardJokerResult.additiveMult);
      }
      if (cardJokerResult.additiveChips > 0) {
        setChips((prev) => prev + cardJokerResult.additiveChips);
      }
      if (cardJokerResult.xMult !== 1) {
        setMultiplier((prev) => prev * cardJokerResult.xMult);
      }
      for (const step of cardJokerResult.steps) {
        const source = `${step.jokerName} on ${stepCardLabel}`;
        if (step.moneyEarned !== undefined && step.moneyEarned !== 0) {
          pushScoringEvent({ kind: "money-delta", amount: step.moneyEarned, source });
        }
        if (step.additiveChips !== undefined && step.additiveChips !== 0) {
          pushScoringEvent({ kind: "chips-delta", amount: step.additiveChips, source });
        }
        if (step.additiveMult !== undefined && step.additiveMult !== 0) {
          pushScoringEvent({ kind: "mult-delta", amount: step.additiveMult, source });
        }
        if (step.xMultFactor !== undefined && step.xMultFactor !== 1) {
          pushScoringEvent({ kind: "mult-times", factor: step.xMultFactor, source });
        }
      }
      pulseJokers(cardJokerResult.firedJokerIds);
      const editionContribution = applyCardEdition(stepCard);
      if (editionContribution && stepCard.edition) {
        const editionLabel = CARD_EDITION_INFO[stepCard.edition].name;
        if (editionContribution.additiveChips > 0) {
          setChips((prev) => prev + editionContribution.additiveChips);
          pushScoringEvent({
            kind: "chips-delta",
            amount: editionContribution.additiveChips,
            source: `${editionLabel} ${stepCardLabel}`,
          });
        }
        if (editionContribution.additiveMult > 0) {
          setMultiplier((prev) => prev + editionContribution.additiveMult);
          pushScoringEvent({
            kind: "mult-delta",
            amount: editionContribution.additiveMult,
            source: `${editionLabel} ${stepCardLabel}`,
          });
        }
        if (editionContribution.xMult !== 1) {
          setMultiplier((prev) => prev * editionContribution.xMult);
          pushScoringEvent({
            kind: "mult-times",
            factor: editionContribution.xMult,
            source: `${editionLabel} ${stepCardLabel}`,
          });
        }
      }
    },
    onFinish: () => {
      const finalize = scoringFinalizeRef.current;
      if (finalize) {
        scoringFinalizeRef.current = null;
        finalize();
      }
    },
  });

  useScoringStepSequence({
    items: goldScoringIds,
    index: goldScoringIndex,
    setIndex: setGoldScoringIndex,
    stepMs,
    onStep: (goldId) => {
      useGame.getState().earn(GOLD_HELD_BONUS_PER_CARD);
      const goldCard = dealt.hand.find((c) => c.id === goldId);
      pushScoringEvent({
        kind: "money-delta",
        amount: GOLD_HELD_BONUS_PER_CARD,
        source: goldCard
          ? `Gold enhancement: ${cardLabel(goldCard)} held`
          : "Gold enhancement held",
      });
      play("gold");
    },
    onFinish: () => {
      const finalize = goldFinalizeRef.current;
      goldFinalizeRef.current = null;
      setGoldScoringIds([]);
      setGoldScoringIndex(0);
      if (finalize) finalize();
    },
  });

  useScoringStepSequence({
    items: steelScoringIds,
    index: steelScoringIndex,
    setIndex: setSteelScoringIndex,
    stepMs,
    onStep: (steelId) => {
      setMultiplier((prev) => prev * STEEL_MULT_FACTOR);
      const steelCard = dealt.hand.find((c) => c.id === steelId);
      pushScoringEvent({
        kind: "mult-times",
        factor: STEEL_MULT_FACTOR,
        source: steelCard
          ? `Steel: ${cardLabel(steelCard)} held`
          : "Steel held",
      });
      play("pop");
    },
    onFinish: () => {
      const finalize = steelFinalizeRef.current;
      steelFinalizeRef.current = null;
      setSteelScoringIds([]);
      setSteelScoringIndex(0);
      if (finalize) finalize();
    },
  });

  useScoringStepSequence({
    items: handLevelSteps,
    index: handLevelIndex,
    setIndex: setHandLevelIndex,
    stepMs,
    onStep: (step) => {
      if (step.additiveChips) {
        setChips((prev) => prev + (step.additiveChips ?? 0));
        pushScoringEvent({
          kind: "chips-delta",
          amount: step.additiveChips,
          source: step.jokerName,
        });
      }
      if (step.additiveMult) {
        setMultiplier((prev) => prev + (step.additiveMult ?? 0));
        pushScoringEvent({
          kind: "mult-delta",
          amount: step.additiveMult,
          source: step.jokerName,
        });
      }
      if (step.xMultFactor !== undefined && step.xMultFactor !== 1) {
        setMultiplier((prev) => prev * (step.xMultFactor ?? 1));
        pushScoringEvent({
          kind: "mult-times",
          factor: step.xMultFactor,
          source: step.jokerName,
        });
      }
      if (step.moneyEarned !== undefined && step.moneyEarned !== 0) {
        useGame.getState().earn(step.moneyEarned);
        pushScoringEvent({
          kind: "money-delta",
          amount: step.moneyEarned,
          source: step.jokerName,
        });
      }
      play("pop");
      pulseJokers([step.jokerId]);
    },
    onFinish: () => {
      const finalize = handLevelFinalizeRef.current;
      handLevelFinalizeRef.current = null;
      setHandLevelSteps([]);
      setHandLevelIndex(0);
      if (finalize) finalize();
    },
  });

  function resetScoring(): void {
    setScoringCards([]);
    setScoringIndex(0);
    scoringFinalizeRef.current = null;
    setGoldScoringIds([]);
    setGoldScoringIndex(0);
    goldFinalizeRef.current = null;
    setSteelScoringIds([]);
    setSteelScoringIndex(0);
    steelFinalizeRef.current = null;
    setHandLevelSteps([]);
    setHandLevelIndex(0);
    handLevelFinalizeRef.current = null;
  }

  return {
    isScoring,
    currentScoringId,
    currentGoldScoringId,
    currentSteelScoringId,
    scoringFinalizeRef,
    goldFinalizeRef,
    steelFinalizeRef,
    handLevelFinalizeRef,
    resetScoring,
  };
}
