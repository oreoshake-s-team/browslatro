import type { MutableRefObject } from "react";
import { useGame } from "../store/game";
import { createSpectralCatalog } from "../items/spectrals";
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
  bossShouldZeroWallet,
  debuffedHandIds,
} from "../items/bosses";
import {
  allCardsScoreFromJokers,
  applyEndOfRoundJokers,
  applyHandLevelJokers,
  applyHandPlayedToJokerStates,
  expandScoringRetriggers,
  applyLuckyTriggersToJokerStates,
  interestMultiplierFromJokers,
  heldRetriggerCountFromJokers,
  applyScoredCardMutations,
  applyScoredMutationsToCards,
  applyEnhancementsEatenToJokerStates,
  chipsPerScoredCardFromJokers,
  consumableCreationsOnHandPlayed,
  canPreventDeath,
  consumeDeathPreventer,
  applyPerCardJokers,
  handEvalOptionsFromJokers,
  isFaceCard,
  handPlayUpgradeRolls,
  firstHandCardCopyCount,
} from "../items/jokers";
import { applyPlanetUpgrade } from "../items/planets";
import { extraConsumableSlots, interestCapFor } from "../items/vouchers";
import {
  deckEndOfRoundBonusPerRemainingHandAndDiscard,
  deckSuppressesInterest,
} from "../items/decks";
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
  planetForHand,
  pickRandomTarot,
} from "../cards/seals";
import {
  getHeldInHand,
  heldEnhancementIdsWithRedSeal,
  steelHeldMultiplier,
} from "../cards/heldInHand";
import { cardKey, nextCardId } from "../cards/deck";
import { recordHandPlayed } from "../run/runStats";

export interface UsePlayHandParams {
  readonly stepMs: number;
  readonly loseGame: (info: { roundScore: number; requiredScore: number }) => void;
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
  const setCardEnhancementsById = useGame((s) => s.setCardEnhancementsById);
  const cardSealsById = useGame((s) => s.cardSealsById);
  const consumables = useGame((s) => s.consumables);
  const selectedDeck = useGame((s) => s.selectedDeck);

  const requiredScore = requiredChipsForBlind({
    ante,
    blind,
    boss: currentBoss,
    stake: selectedStake,
  });
  const consumableCapacity =
    MAX_CONSUMABLE_SLOTS + extraConsumableSlots(ownedVoucherIds);

  const setHandPlayCounts = useGame((s) => s.setHandPlayCounts);
  const runStats = useGame((s) => s.runStats);
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
  const setJokers = useGame((s) => s.setJokers);
  const handPlayCounts = useGame((s) => s.handPlayCounts);

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

    const mrBonesSave =
      newRoundScore < requiredScore &&
      remainingHands <= 1 &&
      canPreventDeath(jokers, newRoundScore, requiredScore);
    if (mrBonesSave) {
      setJokers((prev) => consumeDeathPreventer(prev));
    }
    const roundWon = newRoundScore >= requiredScore || mrBonesSave;
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
        heldRetriggerCountFromJokers(jokers),
      );
      const remainingHandsCount = Math.max(0, remainingHands - 1);
      const greenDeckBonusPerUnit =
        deckEndOfRoundBonusPerRemainingHandAndDiscard(selectedDeck);
      const usesGreenDeckBonus = greenDeckBonusPerUnit > 0;
      const remainingHandsBonus = usesGreenDeckBonus
        ? (remainingHandsCount + remainingDiscards) * greenDeckBonusPerUnit
        : remainingHandsCount * REMAINING_HAND_BONUS;
      const remainingHandsBonusSource = usesGreenDeckBonus
        ? `Remaining hands + discards × $${greenDeckBonusPerUnit}`
        : `Remaining hands × $${REMAINING_HAND_BONUS}`;
      const postGoldWallet = money + heldGoldIds.length * GOLD_HELD_BONUS_PER_CARD;
      const postBonusesWallet = postGoldWallet + remainingHandsBonus;
      const fullDeck = fullDeckPile(
        baseDeckCards,
        destroyedCardIds,
        addedCards,
        cardEnhancementsById,
        cardSealsById,
      ).remaining;
      const endOfRoundJokerResult = applyEndOfRoundJokers(jokers, {
        remainingDiscards,
        discardsUsedThisRound,
        fullDeck,
        uniquePlanetsUsed: useGame.getState().planetsUsed.size,
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
              source: remainingHandsBonusSource,
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
          interest: deckSuppressesInterest(selectedDeck)
            ? 0
            : calculateInterest(
                postGoldWallet,
                interestCapFor(ownedVoucherIds),
              ) * interestMultiplierFromJokers(jokers),
          goldHeldCount: heldGoldIds.length,
          remainingHandsCount,
          remainingDiscardsCount: remainingDiscards,
          remainingHandsBonusPerUnit: usesGreenDeckBonus
            ? greenDeckBonusPerUnit
            : REMAINING_HAND_BONUS,
          usesHandsAndDiscardsBonus: usesGreenDeckBonus,
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
      loseGame({ roundScore: newRoundScore, requiredScore });
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

    const evalOptions = handEvalOptionsFromJokers(jokers);
    const label = detectHandLabel(playedCards, evalOptions);
    const isBossRound = blind === 3;
    if (
      isBossRound &&
      bossBlocksHandLabel(currentBoss, label, handHistoryThisRound)
    ) {
      return;
    }

    pendingHandPlayResetRef.current = true;

    setHandPlayCounts((prev) => ({ ...prev, [label]: prev[label] + 1 }));
    const handPlayCountsAfterThisHand = {
      ...handPlayCounts,
      [label]: handPlayCounts[label] + 1,
    };
    if (
      bossShouldZeroWallet(
        currentBoss,
        isBossRound,
        label,
        handPlayCountsAfterThisHand,
      )
    ) {
      const moneyBeforeWipe = useGame.getState().money;
      useGame.getState().setMoney(0);
      setScoringEvents((prev) => [
        ...prev,
        {
          kind: "money-delta",
          amount: -moneyBeforeWipe,
          source: currentBoss?.name ?? "The Ox",
        },
      ]);
    }
    setRunStats(recordHandPlayed);
    setHandHistoryThisRound((prev) => [...prev, label]);
    setPlayedCardKeysThisAnte((prev) => {
      const next = new Set(prev);
      for (const card of playedCards) next.add(cardKey(card));
      return next;
    });
    const upgradeRolls = handPlayUpgradeRolls(jokers);
    const planetForUpgrade =
      upgradeRolls > 0 ? planetForHand(label) : undefined;
    let statsForThisHand = handStats;
    if (planetForUpgrade !== undefined) {
      for (let u = 0; u < upgradeRolls; u += 1) {
        statsForThisHand = applyPlanetUpgrade(statsForThisHand, planetForUpgrade);
      }
      useGame.getState().setHandStats(statsForThisHand);
    }
    const baseHandEntry = statsForThisHand[label];
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
    const bossTriggered =
      isBossRound &&
      (playedDebuffedIds.size > 0 ||
        psychicZeroed ||
        adjustedHandEntry !== baseHandEntry);
    const preMutationScoring = expandScoringRetriggers(
      getScoringCards(playedCards, label, {
        allCardsScore: allCardsScoreFromJokers(jokers),
        evalOptions,
      }),
      jokers,
      { remainingHands },
    ).filter((c) => !playedDebuffedIds.has(c.id));
    const mutations = applyScoredCardMutations(jokers, preMutationScoring);
    const scoring =
      mutations.enhancementChanges.size > 0
        ? applyScoredMutationsToCards(
            preMutationScoring,
            mutations.enhancementChanges,
          )
        : preMutationScoring;
    if (mutations.enhancementChanges.size > 0) {
      setCardEnhancementsById((prev) => {
        const next = new Map(prev);
        for (const [id, change] of mutations.enhancementChanges) {
          next.set(id, change);
        }
        return next;
      });
    }
    if (mutations.enhancementsEaten > 0) {
      setJokers((prev) =>
        applyEnhancementsEatenToJokerStates(prev, mutations.enhancementsEaten),
      );
    }
    const creations = consumableCreationsOnHandPlayed(jokers, {
      playedHandLabel: label,
      playedCards,
      scoredCards: scoring,
      isFirstHandOfRound: handHistoryThisRound.length === 0,
      money,
    });
    if (creations.tarots > 0 || creations.spectrals > 0) {
      setConsumables((prev) => {
        let next = prev;
        for (let i = 0; i < creations.tarots; i += 1) {
          const after = addConsumable(
            next,
            { kind: "tarot", card: pickRandomTarot() },
            consumableCapacity,
          );
          if (after === next) break;
          next = after;
        }
        for (let i = 0; i < creations.spectrals; i += 1) {
          const pool = createSpectralCatalog().filter((s) => !s.hidden);
          const after = addConsumable(
            next,
            {
              kind: "spectral",
              card: pool[Math.floor(Math.random() * pool.length)],
            },
            consumableCapacity,
          );
          if (after === next) break;
          next = after;
        }
        return next;
      });
    }
    if (creations.destroyedCardId !== null) {
      const destroyedId = creations.destroyedCardId;
      useGame.getState().setDestroyedCardIds((prev) => {
        if (prev.has(destroyedId)) return prev;
        const next = new Set(prev);
        next.add(destroyedId);
        return next;
      });
    }
    const dnaCopies = firstHandCardCopyCount(
      jokers,
      playedCards.length,
      handHistoryThisRound.length === 0,
    );
    if (dnaCopies > 0) {
      const copies = Array.from({ length: dnaCopies }, () => ({
        ...playedCards[0],
        id: nextCardId(),
      }));
      useGame.getState().setAddedCards((prev) => [...prev, ...copies]);
      useGame.getState().setDealt((prev) => ({
        hand: [...prev.hand, ...copies],
        remaining: prev.remaining,
      }));
    }
    const chipsPerScored = chipsPerScoredCardFromJokers(jokers);
    if (chipsPerScored > 0) {
      const scoredIds = new Set(scoring.map((c) => c.id));
      const addBonus = (cards: ReadonlyArray<Card>): Card[] =>
        cards.map((c) =>
          scoredIds.has(c.id)
            ? { ...c, bonusChips: (c.bonusChips ?? 0) + chipsPerScored }
            : c,
        );
      useGame.getState().setBaseDeckCards(addBonus);
      useGame.getState().setAddedCards(addBonus);
    }
    setJokers((prev) =>
      applyHandPlayedToJokerStates(prev, {
        playedHandLabel: label,
        playedCardCount: playedCards.length,
        scoredCards: scoring,
        handPlayCounts,
      }),
    );
    if (scoring.length === 0) {
      const noCardsHandJokerResult = applyHandLevelJokers(
        jokers,
        {
          playedHandLabel: label,
          playedCardCount: playedCards.length,
          scoredCards: [],
          remainingDiscards,
          remainingHands,
          money,
          heldInHandCards: getHeldInHand(dealt.hand, submittedSelection),
          fullDeck: fullDeckPile(
            baseDeckCards,
            destroyedCardIds,
            addedCards,
            cardEnhancementsById,
            cardSealsById,
          ).remaining,
          remainingDeck: dealt.remaining,
          baseDeckSize: baseDeckCards.length,
          handPlayCounts: {
            ...handPlayCounts,
            [label]: handPlayCounts[label] + 1,
          },
          handLabelsThisRound: handHistoryThisRound,
          blindsSkipped: runStats.blindsSkipped,
          addedCardsCount: addedCards.length,
          todoHand: useGame.getState().todoHand,
          bossTriggered,
        },
      );
      const noCardsMatchingObservatoryPlanets = consumables.filter(
        (c) => c.kind === "planet" && c.card.hands.includes(label),
      ).length;
      const noCardsObservatoryMult = observatoryMultFor(
        ownedVoucherIds,
        noCardsMatchingObservatoryPlanets,
      );
      const noCardsChips =
        handEntry.chips + noCardsHandJokerResult.additiveChips;
      const noCardsMult =
        (handEntry.multiplier + noCardsHandJokerResult.additiveMult) *
        noCardsHandJokerResult.xMult *
        noCardsObservatoryMult;
      const handOnlyScore = Math.floor(noCardsChips * noCardsMult);
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
    const handPlayCountsWithThisHand = {
      ...handPlayCounts,
      [label]: handPlayCounts[label] + 1,
    };
    const handJokerResult = applyHandLevelJokers(jokers, {
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
      handPlayCounts: handPlayCountsWithThisHand,
      handLabelsThisRound: handHistoryThisRound,
      blindsSkipped: runStats.blindsSkipped,
      addedCardsCount: addedCards.length,
      todoHand: useGame.getState().todoHand,
      bossTriggered,
    });

    let perCardAdditiveMult = 0;
    let perCardAdditiveChips = 0;
    let perCardXMult = 1;
    let firstFaceAlreadyScoredUpfront = false;
    const luckyRollsByScoringIndex: LuckyRollResult[] = [];
    const smearedSuitsActive =
      handEvalOptionsFromJokers(jokers).smearedSuits ===
      true;
    for (let i = 0; i < scoring.length; i += 1) {
      const perCard = applyPerCardJokers(jokers, scoring[i], Math.random, {
        firstFaceAlreadyScored: firstFaceAlreadyScoredUpfront,
        smearedSuits: smearedSuitsActive,
        idolTarget: useGame.getState().idolTarget,
        ancientSuit: useGame.getState().ancientSuit,
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
    const luckyTriggerCount = luckyRollsByScoringIndex.reduce(
      (sum, roll) =>
        sum + (roll.multBonus > 0 ? 1 : 0) + (roll.moneyBonus > 0 ? 1 : 0),
      0,
    );
    if (luckyTriggerCount > 0) {
      setJokers((prev) =>
        applyLuckyTriggersToJokerStates(prev, luckyTriggerCount),
      );
    }

    const heldSteelIds = heldEnhancementIdsWithRedSeal(
      dealt.hand,
      submittedSelection,
      "steel",
    );
    const steelMult = steelHeldMultiplier(
      dealt.hand,
      submittedSelection,
      heldRetriggerCountFromJokers(jokers),
    );
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
