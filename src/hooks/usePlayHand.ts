import type { MutableRefObject } from "react";
import { useGame } from "../store/game";
import { useScoringPipeline } from "./useScoringPipeline";
import { play } from "../components/system/sounds";
import type { Card } from "../cards/types";
import { detectHandLabel, type HandLabel } from "../scoring/handEvaluator";
import {
  getCardChips,
  getCardMultDelta,
  getScoringCards,
} from "../scoring/scoring";
import type { ScoringEvent } from "../scoring/scoringTrace";
import {
  GOLD_HELD_BONUS_PER_CARD,
  REMAINING_HAND_BONUS,
  calculateInterest,
} from "../scoring/payout";
import {
  bossAdjustHandEntry,
  bossBlocksHandLabel,
  bossMoneyPenaltyPerCard,
  bossRequiredCardCount,
  debuffedHandIds,
} from "../items/bosses";
import {
  allCardsScoreFromJokers,
  applyEndOfRoundJokers,
  applyHandLevelJokers,
  applyPerCardJokers,
  handEvalOptionsFromJokers,
  isFaceCard,
  isJokerActive,
} from "../items/jokers";
import { extraConsumableSlots, interestCapFor } from "../items/vouchers";
import { fullDeckPile } from "../cards/deckBuild";
import { hasStakeModifier } from "../items/stakes";
import { observatoryMultFor } from "../items/vouchers";
import {
  MAX_CONSUMABLE_SLOTS,
  addConsumable,
} from "../items/consumables";
import { requiredChipsForBlind } from "../scoring/anteScaling";
import {
  applyCardEnhancement,
  applyLuckyRolls,
  type LuckyRollResult,
} from "../cards/enhancements";
import {
  blueSealHeldCards,
  expandRedSealRetriggers,
  planetForHand,
} from "../cards/seals";
import {
  getHeldInHand,
  heldEnhancementIdsWithRedSeal,
  steelHeldMultiplier,
} from "../cards/heldInHand";
import { cardKey } from "../cards/deck";
import { recordHandPlayed } from "../run/runStats";

export interface UsePlayHandParams {
  readonly stepMs: number;
  readonly loseGame: () => void;
  readonly pendingDiscardCountRef: MutableRefObject<number>;
  readonly pendingHandPlayResetRef: MutableRefObject<boolean>;
  readonly skipDrawAfterDiscardRef: MutableRefObject<boolean>;
}

export interface UsePlayHandResult {
  readonly submitHand: () => void;
  readonly isScoring: boolean;
  readonly currentScoringId: number | null;
  readonly currentGoldScoringId: number | null;
  readonly currentSteelScoringId: number | null;
  readonly resetScoring: () => void;
}

export function usePlayHand({
  stepMs,
  loseGame,
  pendingDiscardCountRef,
  pendingHandPlayResetRef,
  skipDrawAfterDiscardRef,
}: UsePlayHandParams): UsePlayHandResult {
  const pipeline = useScoringPipeline({ stepMs });

  const discardingIds = useGame((s) => s.discardingIds);
  const dealt = useGame((s) => s.dealt);
  const handDisplayOrder = useGame((s) => s.handDisplayOrder);
  const selectedIds = useGame((s) => s.selectedIds);
  const blind = useGame((s) => s.blind);
  const ante = useGame((s) => s.ante);
  const money = useGame((s) => s.money);
  const currentBoss = useGame((s) => s.currentBoss);
  const selectedStake = useGame((s) => s.selectedStake);
  const handHistoryThisRound = useGame((s) => s.handHistoryThisRound);
  const jokers = useGame((s) => s.jokers);
  const remainingDiscards = useGame((s) => s.remainingDiscards);
  const discardsUsedThisRound = useGame((s) => s.discardsUsedThisRound);
  const handStats = useGame((s) => s.handStats);
  const playedCardKeysThisAnte = useGame((s) => s.playedCardKeysThisAnte);
  const devChipsBonus = useGame((s) => s.devChipsBonus);
  const devMultBonus = useGame((s) => s.devMultBonus);
  const devMultFactor = useGame((s) => s.devMultFactor);
  const roundScore = useGame((s) => s.roundScore);
  const remainingHands = useGame((s) => s.remainingHands);
  const ownedVoucherIds = useGame((s) => s.ownedVoucherIds);
  const baseDeckCards = useGame((s) => s.baseDeckCards);
  const destroyedCardIds = useGame((s) => s.destroyedCardIds);
  const addedCards = useGame((s) => s.addedCards);
  const cardEnhancementsById = useGame((s) => s.cardEnhancementsById);
  const cardSealsById = useGame((s) => s.cardSealsById);
  const consumables = useGame((s) => s.consumables);

  const requiredScore = requiredChipsForBlind({
    ante,
    blind,
    boss: currentBoss,
    stake: selectedStake,
  });
  const consumableCapacity =
    MAX_CONSUMABLE_SLOTS + extraConsumableSlots(ownedVoucherIds);

  const setHandPlayCounts = useGame((s) => s.setHandPlayCounts);
  const setRunStats = useGame((s) => s.setRunStats);
  const setHandHistoryThisRound = useGame((s) => s.setHandHistoryThisRound);
  const setPlayedCardKeysThisAnte = useGame((s) => s.setPlayedCardKeysThisAnte);
  const setChips = useGame((s) => s.setChips);
  const setMultiplier = useGame((s) => s.setMultiplier);
  const setScoringEvents = useGame((s) => s.setScoringEvents);
  const setLuckyMultProcIds = useGame((s) => s.setLuckyMultProcIds);
  const setLuckyMoneyProcIds = useGame((s) => s.setLuckyMoneyProcIds);
  const setScoringCards = useGame((s) => s.setScoringCards);
  const setScoringIndex = useGame((s) => s.setScoringIndex);
  const setLuckyRollsByScoringIndex = useGame(
    (s) => s.setLuckyRollsByScoringIndex,
  );
  const setSelectedHand = useGame((s) => s.setSelectedHand);
  const setDiscardingIds = useGame((s) => s.setDiscardingIds);
  const setRoundScore = useGame((s) => s.setRoundScore);
  const setDevChipsBonus = useGame((s) => s.setDevChipsBonus);
  const setDevMultBonus = useGame((s) => s.setDevMultBonus);
  const setDevMultFactor = useGame((s) => s.setDevMultFactor);
  const setConsumables = useGame((s) => s.setConsumables);
  const setGoldScoringIds = useGame((s) => s.setGoldScoringIds);
  const setGoldScoringIndex = useGame((s) => s.setGoldScoringIndex);
  const setSteelScoringIds = useGame((s) => s.setSteelScoringIds);
  const setSteelScoringIndex = useGame((s) => s.setSteelScoringIndex);
  const setHandLevelSteps = useGame((s) => s.setHandLevelSteps);
  const setHandLevelIndex = useGame((s) => s.setHandLevelIndex);
  const setRemainingHands = useGame((s) => s.setRemainingHands);
  const setPendingWin = useGame((s) => s.setPendingWin);

  function finalizeHandSubmission(
    score: number,
    submittedSelection: ReadonlySet<number>,
    playedHandLabel: HandLabel | null = null,
  ): void {
    const newRoundScore = roundScore + score;
    setRoundScore(newRoundScore);
    setChips(0);
    setMultiplier(0);
    setDevChipsBonus(0);
    setDevMultBonus(0);
    setDevMultFactor(1);
    setSelectedHand(null);
    setScoringCards([]);
    setScoringIndex(0);

    const roundWon = newRoundScore >= requiredScore;
    if (submittedSelection.size > 0) {
      pendingDiscardCountRef.current = submittedSelection.size;
      skipDrawAfterDiscardRef.current = roundWon;
      setDiscardingIds(submittedSelection);
    }

    if (roundWon) {
      if (playedHandLabel !== null) {
        const blueHeld = blueSealHeldCards(dealt.hand, submittedSelection);
        if (blueHeld.length > 0) {
          const planet = planetForHand(playedHandLabel);
          if (planet) {
            setConsumables((prev) => {
              let next = prev;
              for (let i = 0; i < blueHeld.length; i += 1) {
                const after = addConsumable(
                  next,
                  { kind: "planet", card: planet },
                  consumableCapacity,
                );
                if (after === next) break;
                next = after;
              }
              return next;
            });
          }
        }
      }
      const heldGoldIds = heldEnhancementIdsWithRedSeal(
        dealt.hand,
        submittedSelection,
        "gold",
      );
      const remainingHandsCount = Math.max(0, remainingHands - 1);
      const remainingHandsBonus = remainingHandsCount * REMAINING_HAND_BONUS;
      const postGoldWallet = money + heldGoldIds.length * GOLD_HELD_BONUS_PER_CARD;
      const postBonusesWallet = postGoldWallet + remainingHandsBonus;
      const fullDeck = fullDeckPile(
        baseDeckCards,
        destroyedCardIds,
        addedCards,
        cardEnhancementsById,
        cardSealsById,
      ).remaining;
      const endOfRoundJokerResult = applyEndOfRoundJokers(jokers.filter(isJokerActive), {
        remainingDiscards,
        discardsUsedThisRound,
        fullDeck,
      });
      const postJokerWallet = postBonusesWallet + endOfRoundJokerResult.moneyEarned;
      const openModal = () => {
        play("win");
        if (remainingHandsBonus > 0) {
          useGame.getState().earn(remainingHandsBonus);
          setScoringEvents((prev) => [
            ...prev,
            {
              kind: "money-delta",
              amount: remainingHandsBonus,
              source: `Remaining hands × $${REMAINING_HAND_BONUS}`,
            },
          ]);
        }
        for (const step of endOfRoundJokerResult.steps) {
          useGame.getState().earn(step.moneyEarned);
          setScoringEvents((prev) => [
            ...prev,
            {
              kind: "money-delta",
              amount: step.moneyEarned,
              source: step.jokerName,
            },
          ]);
        }
        const smallBlindSkipped =
          blind === 1 &&
          hasStakeModifier(selectedStake, "red-small-blind-no-reward");
        setPendingWin({
          roundScore: newRoundScore,
          requiredScore,
          baseReward: smallBlindSkipped ? 0 : blind + 2,
          walletAtPayout: postJokerWallet,
          interestWallet: postGoldWallet,
          interest: calculateInterest(
            postGoldWallet,
            interestCapFor(ownedVoucherIds),
          ),
          goldHeldCount: heldGoldIds.length,
          remainingHandsCount,
          endOfRoundJokerSteps: endOfRoundJokerResult.steps,
        });
      };
      if (heldGoldIds.length === 0) {
        openModal();
        return;
      }
      pipeline.goldFinalizeRef.current = openModal;
      setGoldScoringIds(heldGoldIds);
      setGoldScoringIndex(0);
      return;
    }

    if (remainingHands > 1) {
      setRemainingHands((prev) => prev - 1);
    } else {
      loseGame();
    }
  }

  function submitHand(): void {
    if (discardingIds.size > 0) return;
    if (pipeline.isScoring) return;

    const handById = new Map(dealt.hand.map((c) => [c.id, c]));
    const playedCards = handDisplayOrder
      .map((id) => handById.get(id))
      .filter((c): c is Card => c !== undefined && selectedIds.has(c.id));
    const submittedSelection = selectedIds;

    if (playedCards.length === 0) {
      finalizeHandSubmission(0, submittedSelection);
      return;
    }

    const moneyPenalty =
      blind === 3
        ? bossMoneyPenaltyPerCard(currentBoss) * playedCards.length
        : 0;
    if (moneyPenalty > 0) {
      useGame.getState().setMoney(money - moneyPenalty);
    }

    const label = detectHandLabel(
      playedCards,
      handEvalOptionsFromJokers(jokers.filter(isJokerActive)),
    );
    const isBossRound = blind === 3;
    if (
      isBossRound &&
      bossBlocksHandLabel(currentBoss, label, handHistoryThisRound)
    ) {
      return;
    }

    pendingHandPlayResetRef.current = true;

    setHandPlayCounts((prev) => ({ ...prev, [label]: prev[label] + 1 }));
    setRunStats(recordHandPlayed);
    setHandHistoryThisRound((prev) => [...prev, label]);
    setPlayedCardKeysThisAnte((prev) => {
      const next = new Set(prev);
      for (const card of playedCards) next.add(cardKey(card));
      return next;
    });
    const baseHandEntry = handStats[label];
    const adjustedHandEntry = isBossRound
      ? bossAdjustHandEntry(currentBoss, label, baseHandEntry)
      : baseHandEntry;
    const forcedCount = isBossRound
      ? bossRequiredCardCount(currentBoss)
      : null;
    const psychicZeroed =
      forcedCount !== null && playedCards.length !== forcedCount;
    const handEntry = psychicZeroed
      ? { ...adjustedHandEntry, chips: 0, multiplier: 0 }
      : adjustedHandEntry;
    const playedDebuffedIds = debuffedHandIds(
      playedCards,
      currentBoss,
      isBossRound,
      playedCardKeysThisAnte,
    );
    const scoring = expandRedSealRetriggers(
      getScoringCards(playedCards, label, {
        allCardsScore: allCardsScoreFromJokers(jokers),
      }),
    ).filter((c) => !playedDebuffedIds.has(c.id));
    if (scoring.length === 0) {
      const handOnlyScore = handEntry.chips * handEntry.multiplier;
      finalizeHandSubmission(handOnlyScore, submittedSelection, label);
      return;
    }
    const cardChipsTotal = scoring.reduce(
      (sum, card) => sum + getCardChips(card),
      0,
    );
    const handLevelFullDeck = fullDeckPile(
      baseDeckCards,
      destroyedCardIds,
      addedCards,
      cardEnhancementsById,
      cardSealsById,
    ).remaining;
    const handJokerResult = applyHandLevelJokers(jokers.filter(isJokerActive), {
      playedHandLabel: label,
      playedCardCount: playedCards.length,
      scoredCards: scoring,
      remainingDiscards,
      remainingHands,
      money,
      heldInHandCards: getHeldInHand(dealt.hand, submittedSelection),
      fullDeck: handLevelFullDeck,
      remainingDeck: dealt.remaining,
      baseDeckSize: baseDeckCards.length,
    });

    let perCardAdditiveMult = 0;
    let perCardAdditiveChips = 0;
    let perCardXMult = 1;
    let firstFaceAlreadyScoredUpfront = false;
    const luckyRollsByScoringIndex: LuckyRollResult[] = [];
    const smearedSuitsActive =
      handEvalOptionsFromJokers(jokers.filter(isJokerActive)).smearedSuits ===
      true;
    for (let i = 0; i < scoring.length; i += 1) {
      const perCard = applyPerCardJokers(jokers.filter(isJokerActive), scoring[i], Math.random, {
        firstFaceAlreadyScored: firstFaceAlreadyScoredUpfront,
        smearedSuits: smearedSuitsActive,
      });
      perCardAdditiveMult += perCard.additiveMult;
      perCardAdditiveChips += perCard.additiveChips;
      perCardAdditiveMult += getCardMultDelta(scoring[i]);
      perCardXMult *= perCard.xMult;
      const luckyRoll = applyLuckyRolls(scoring[i]);
      luckyRollsByScoringIndex.push(luckyRoll);
      perCardAdditiveMult += luckyRoll.multBonus;
      if (isFaceCard(scoring[i])) firstFaceAlreadyScoredUpfront = true;
    }
    setLuckyRollsByScoringIndex(luckyRollsByScoringIndex);

    const heldSteelIds = heldEnhancementIdsWithRedSeal(
      dealt.hand,
      submittedSelection,
      "steel",
    );
    const steelMult = steelHeldMultiplier(dealt.hand, submittedSelection);
    const enhancementXMult = scoring.reduce(
      (m, card) => m * applyCardEnhancement(card).multTimes,
      1,
    );
    const matchingObservatoryPlanets = consumables.filter(
      (c) => c.kind === "planet" && c.card.hands.includes(label),
    ).length;
    const observatoryMult = observatoryMultFor(
      ownedVoucherIds,
      matchingObservatoryPlanets,
    );
    const preHandXMultNoSteel =
      handJokerResult.xMult * enhancementXMult * perCardXMult;
    const totalXMult = preHandXMultNoSteel * steelMult * observatoryMult;

    const scoringChipsTotal =
      handEntry.chips +
      cardChipsTotal +
      handJokerResult.additiveChips +
      perCardAdditiveChips;
    const scoringMult =
      (handEntry.multiplier +
        handJokerResult.additiveMult +
        perCardAdditiveMult) *
      totalXMult;
    const adjustedChips = scoringChipsTotal + devChipsBonus;
    const adjustedMult = (scoringMult + devMultBonus) * devMultFactor;
    const finalScore = Math.floor(adjustedChips * adjustedMult);

    const liveMultiplier = handEntry.multiplier * enhancementXMult;
    setChips(handEntry.chips);
    setMultiplier(liveMultiplier);

    const finalize = () => {
      finalizeHandSubmission(finalScore, submittedSelection, label);
    };
    const runObservatory = () => {
      if (observatoryMult !== 1) {
        setScoringEvents((prev) => [
          ...prev,
          {
            kind: "mult-times",
            factor: observatoryMult,
            source: `Observatory: ${matchingObservatoryPlanets} matching Planet${matchingObservatoryPlanets === 1 ? "" : "s"}`,
          },
        ]);
      }
      finalize();
    };
    const runHandLevel = () => {
      if (handJokerResult.steps.length === 0) {
        runObservatory();
        return;
      }
      pipeline.handLevelFinalizeRef.current = runObservatory;
      setHandLevelSteps(handJokerResult.steps);
      setHandLevelIndex(0);
    };
    pipeline.scoringFinalizeRef.current = () => {
      if (heldSteelIds.length === 0) {
        runHandLevel();
        return;
      }
      pipeline.steelFinalizeRef.current = runHandLevel;
      setSteelScoringIds(heldSteelIds);
      setSteelScoringIndex(0);
    };
    const baseEvent: ScoringEvent = {
      kind: "hand-base",
      chips: handEntry.chips,
      mult: handEntry.multiplier,
      handLabel: label,
      level: handEntry.level,
    };
    const submitEvents: ScoringEvent[] = [baseEvent];
    if (psychicZeroed) {
      submitEvents.push({
        kind: "boss-adjustment",
        description: `${label} zeroed to 0 × 0 (needs ${forcedCount} cards, played ${playedCards.length})`,
        source: currentBoss.name,
      });
    } else if (
      isBossRound &&
      (handEntry.chips !== baseHandEntry.chips ||
        handEntry.multiplier !== baseHandEntry.multiplier ||
        handEntry.level !== baseHandEntry.level)
    ) {
      submitEvents.push({
        kind: "boss-adjustment",
        description: `${label} adjusted to ${handEntry.chips} × ${handEntry.multiplier} (Lv ${handEntry.level})`,
        source: currentBoss.name,
      });
    }
    if (moneyPenalty > 0) {
      submitEvents.push({
        kind: "money-delta",
        amount: -moneyPenalty,
        source: `${currentBoss.name}: ${playedCards.length} cards played`,
      });
    }
    if (devChipsBonus !== 0) {
      submitEvents.push({
        kind: "chips-delta",
        amount: devChipsBonus,
        source: "Apply Modifiers (dev)",
      });
    }
    if (devMultBonus !== 0) {
      submitEvents.push({
        kind: "mult-delta",
        amount: devMultBonus,
        source: "Apply Modifiers (dev)",
      });
    }
    if (devMultFactor !== 1) {
      submitEvents.push({
        kind: "mult-times",
        factor: devMultFactor,
        source: "Apply Modifiers (dev)",
      });
    }
    setScoringEvents((prev) => [...prev, ...submitEvents]);
    setLuckyMultProcIds(new Set());
    setLuckyMoneyProcIds(new Set());
    setScoringCards(scoring);
    setScoringIndex(0);
  }

  return {
    submitHand,
    isScoring: pipeline.isScoring,
    currentScoringId: pipeline.currentScoringId,
    currentGoldScoringId: pipeline.currentGoldScoringId,
    currentSteelScoringId: pipeline.currentSteelScoringId,
    resetScoring: pipeline.resetScoring,
  };
}
