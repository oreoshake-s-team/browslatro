import { useEffect, useRef, useState } from "react";
import "./App.css";
import { useGame } from "./store/game";
import { BASE_VOUCHER_SLOTS } from "./store/vouchers";
import type { Blind, Card, Enhancement, Hand, Seal } from "./cards/types";
import { BASE_CHIPS, BLIND_MULTIPLIERS } from "./constants";
import {
  DEFAULT_STARTING_DISCARDS,
  DEFAULT_STARTING_HANDS,
  applyBossFaceDown,
  bossAdjustHandEntry,
  bossRequiredCardCount,
  bossBlocksHandLabel,
  availableBosses,
  bossHandSize,
  bossMoneyPenaltyPerCard,
  bossPickerRngConfig,
  bossStartingDiscards,
  bossStartingHands,
  createBossCatalog,
  debuffedHandIds,
  pickBossForAnte,
  type BossBlind,
} from "./items/bosses";
import { chanceOverrideConfig } from "./dev/chanceOverride";
import Game from "./components/game/Game";
import RoundWonModal from "./components/game/RoundWonModal";
import {
  rollPackForPool,
  type PackPool,
  type PackVariant,
} from "./items/packs";
import BlindSelectScreen from "./components/game/BlindSelectScreen";
import NopeAnimation from "./components/game/NopeAnimation";
import {
  resolveTagEffect,
  rollAnteSkipOffers,
  tagOfferRngConfig,
  type TagId,
} from "./items/tags";
import { immediateMoneyGain } from "./run/immediateActions";
import { applyNextShopModifiers } from "./run/nextShopMods";
import {
  initialRunStats,
  recordBlindSkipped,
  recordHandPlayed,
  type RunStats,
} from "./run/runStats";
import { applyPlanetUpgrade, availablePlanets, createPlanetCatalog } from "./items/planets";
import {
  createSpectralCatalog,
  duplicateSelectedInHand,
  spectralNeedsTarget,
} from "./items/spectrals";
import {
  createTarotCatalog,
  resolveHermitPayout,
  resolveTemperancePayout,
  rollWheelOfFortune,
} from "./items/tarots";
import {
  MAX_CONSUMABLE_SLOTS,
  addConsumable,
  consumableUseBlock,
  hasFreeConsumableSlot,
  removeConsumableAt,
} from "./items/consumables";
import Sidebar from "./components/hud/Sidebar";
import { play } from "./components/system/sounds";
import {
  getAnimationSpeed,
  getAnimationSpeedMultiplier,
  hasUserOverriddenAnimationSpeed,
  usePreferences,
  type AnimationSpeed,
} from "./components/system/preferences";
import { detectHandLabel, type HandLabel } from "./scoring/handEvaluator";
import {
  getCardChips,
  getCardMultDelta,
  getRankChips,
  getScoringCards,
  getScoringStep,
} from "./scoring/scoring";
import { cardLabel, type ScoringEvent } from "./scoring/scoringTrace";
import { cardKey, drawCountForRefill, HAND_SIZE } from "./cards/deck";
import { initialDeal } from "./cards/deckBuild";
import { MAX_SELECTED } from "./components/cards/Hand";
import {
  calculateInterest,
  GOLD_HELD_BONUS_PER_CARD,
  REMAINING_HAND_BONUS,
} from "./scoring/payout";
import {
  STEEL_MULT_FACTOR,
  getHeldInHand,
  steelHeldMultiplier,
} from "./cards/heldInHand";
import {
  applyCardEnhancement,
  applyLuckyRolls,
  cardRankForEvaluation,
  rollEnhancementChance,
} from "./cards/enhancements";
import {
  blueSealHeldCards,
  expandRedSealRetriggers,
  goldSealMoney,
  pickRandomTarot,
  planetForHand,
  purpleSealDiscarded,
} from "./cards/seals";
import {
  MAX_JOKERS,
  applyHandLevelJokers,
  applyPerCardJokers,
  createJokerByRarity,
  createJokerCatalog,
  effectiveJokerCount,
  initialJokersConfig,
  isFaceCard,
  withEdition,
} from "./items/jokers";
import { SHOP_PACK_SLOTS, shopPickerRngConfig } from "./items/shop";
import {
  extraConsumableSlots,
  extraHandSize,
  extraJokerSlots,
  extraStartingDiscards,
  extraStartingHands,
  interestCapFor,
  pickVouchersForAnte,
  VOUCHER_CATALOG,
  type VoucherId,
} from "./items/vouchers";

export const SCORING_STEP_MS = 500;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function getScoringStepMs(
  speed: AnimationSpeed = getAnimationSpeed(),
): number {
  if (hasUserOverriddenAnimationSpeed(speed)) {
    return Math.round(SCORING_STEP_MS * getAnimationSpeedMultiplier(speed));
  }
  if (prefersReducedMotion()) return 0;
  return SCORING_STEP_MS;
}

function App() {
  const blind = useGame((state) => state.blind);
  const setBlind = useGame((state) => state.setBlind);
  const round = useGame((state) => state.round);
  const setRound = useGame((state) => state.setRound);
  const ante = useGame((state) => state.ante);
  const setAnte = useGame((state) => state.setAnte);
  const money = useGame((state) => state.money);
  const chips = useGame((state) => state.chips);
  const setChips = useGame((state) => state.setChips);
  const multiplier = useGame((state) => state.multiplier);
  const setMultiplier = useGame((state) => state.setMultiplier);
  // Dev "Apply modifiers" offsets. Sticky across selection/scoring/finalize
  // so the displayed chips/multiplier reflect manual bumps until a New game
  // resets them. See #265.
  const devChipsBonus = useGame((state) => state.devChipsBonus);
  const setDevChipsBonus = useGame((state) => state.setDevChipsBonus);
  const devMultBonus = useGame((state) => state.devMultBonus);
  const setDevMultBonus = useGame((state) => state.setDevMultBonus);
  const devMultFactor = useGame((state) => state.devMultFactor);
  const setDevMultFactor = useGame((state) => state.setDevMultFactor);
  const forceProbabilities = useGame((state) => state.forceProbabilities);
  const setForceProbabilities = useGame(
    (state) => state.setForceProbabilities,
  );
  useEffect(() => {
    chanceOverrideConfig.force100 = forceProbabilities;
    return () => {
      chanceOverrideConfig.force100 = false;
    };
  }, [forceProbabilities]);
  const roundScore = useGame((state) => state.roundScore);
  const setRoundScore = useGame((state) => state.setRoundScore);
  const selectedHand = useGame((state) => state.selectedHand);
  const setSelectedHand = useGame((state) => state.setSelectedHand);
  const remainingHands = useGame((state) => state.remainingHands);
  const setRemainingHands = useGame((state) => state.setRemainingHands);
  const remainingDiscards = useGame((state) => state.remainingDiscards);
  const setRemainingDiscards = useGame((state) => state.setRemainingDiscards);
  const runStats = useGame((state) => state.runStats);
  const setRunStats = useGame((state) => state.setRunStats);
  const dealt = useGame((state) => state.dealt);
  const setDealt = useGame((state) => state.setDealt);
  useEffect(() => {
    setDealt(initialDeal());
  }, [setDealt]);
  const highVisibility = usePreferences((state) => state.highVisibility);
  const animationSpeed = usePreferences((state) => state.animationSpeed);
  const selectedIds = useGame((state) => state.selectedIds);
  const setSelectedIds = useGame((state) => state.setSelectedIds);
  const discardingIds = useGame((state) => state.discardingIds);
  const setDiscardingIds = useGame((state) => state.setDiscardingIds);
  const handDisplayOrder = useGame((state) => state.handDisplayOrder);
  const setHandDisplayOrder = useGame((state) => state.setHandDisplayOrder);
  const jokers = useGame((state) => state.jokers);
  const setJokers = useGame((state) => state.setJokers);
  const jokerPulseCounters = useGame((state) => state.jokerPulseCounters);
  const setJokerPulseCounters = useGame((state) => state.setJokerPulseCounters);
  useEffect(() => {
    setJokers(initialJokersConfig.factory());
  }, [setJokers]);
  const handPlayCounts = useGame((state) => state.handPlayCounts);
  const setHandPlayCounts = useGame((state) => state.setHandPlayCounts);
  const handStats = useGame((state) => state.handStats);
  const setHandStats = useGame((state) => state.setHandStats);
  const pendingDiscardCountRef = useRef(0);
  const pendingHandPlayResetRef = useRef(false);
  const handPlaySignal = useGame((state) => state.handPlaySignal);
  const setHandPlaySignal = useGame((state) => state.setHandPlaySignal);
  const skipDrawAfterDiscardRef = useRef(false);
  const destroyedCardKeys = useGame((state) => state.destroyedCardKeys);
  const setDestroyedCardKeys = useGame((state) => state.setDestroyedCardKeys);
  const scoringEvents = useGame((state) => state.scoringEvents);
  const setScoringEvents = useGame((state) => state.setScoringEvents);

  function pushScoringEvent(event: ScoringEvent) {
    setScoringEvents((prev) => [...prev, event]);
  }
  const addedCards = useGame((state) => state.addedCards);
  const setAddedCards = useGame((state) => state.setAddedCards);
  const cardEnhancementsByKey = useGame((state) => state.cardEnhancementsByKey);
  const setCardEnhancementsByKey = useGame(
    (state) => state.setCardEnhancementsByKey,
  );
  const cardSealsByKey = useGame((state) => state.cardSealsByKey);
  const setCardSealsByKey = useGame((state) => state.setCardSealsByKey);

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

  // Sequential scoring state.
  const scoringCards = useGame((state) => state.scoringCards);
  const setScoringCards = useGame((state) => state.setScoringCards);
  const scoringIndex = useGame((state) => state.scoringIndex);
  const setScoringIndex = useGame((state) => state.setScoringIndex);
  const scoringFinalizeRef = useRef<(() => void) | null>(null);
  const isScoring = scoringCards.length > 0 && scoringIndex < scoringCards.length;
  const currentScoringId = isScoring ? scoringCards[scoringIndex].id : null;

  const goldScoringIds = useGame((state) => state.goldScoringIds);
  const setGoldScoringIds = useGame((state) => state.setGoldScoringIds);
  const goldScoringIndex = useGame((state) => state.goldScoringIndex);
  const setGoldScoringIndex = useGame((state) => state.setGoldScoringIndex);
  const goldFinalizeRef = useRef<(() => void) | null>(null);
  const currentGoldScoringId =
    goldScoringIds.length > 0 && goldScoringIndex < goldScoringIds.length
      ? goldScoringIds[goldScoringIndex]
      : null;

  const steelScoringIds = useGame((state) => state.steelScoringIds);
  const setSteelScoringIds = useGame((state) => state.setSteelScoringIds);
  const steelScoringIndex = useGame((state) => state.steelScoringIndex);
  const setSteelScoringIndex = useGame((state) => state.setSteelScoringIndex);
  const steelFinalizeRef = useRef<(() => void) | null>(null);
  const currentSteelScoringId =
    steelScoringIds.length > 0 && steelScoringIndex < steelScoringIds.length
      ? steelScoringIds[steelScoringIndex]
      : null;

  const luckyMultProcIds = useGame((state) => state.luckyMultProcIds);
  const setLuckyMultProcIds = useGame((state) => state.setLuckyMultProcIds);
  const luckyMoneyProcIds = useGame((state) => state.luckyMoneyProcIds);
  const setLuckyMoneyProcIds = useGame((state) => state.setLuckyMoneyProcIds);

  const [nopeTriggerKey, setNopeTriggerKey] = useState(0);
  function triggerNopeAnimation() {
    setNopeTriggerKey((prev) => prev + 1);
  }

  const handLevelSteps = useGame((state) => state.handLevelSteps);
  const setHandLevelSteps = useGame((state) => state.setHandLevelSteps);
  const handLevelIndex = useGame((state) => state.handLevelIndex);
  const setHandLevelIndex = useGame((state) => state.setHandLevelIndex);
  const handLevelFinalizeRef = useRef<(() => void) | null>(null);

  // Round-won modal: when non-null, the player has met the required score and
  // the modal is showing. Dismissal triggers handleWin().
  const pendingWin = useGame((state) => state.pendingWin);
  const setPendingWin = useGame((state) => state.setPendingWin);

  const shopOffers = useGame((state) => state.shopOffers);
  const setShopOffers = useGame((state) => state.setShopOffers);
  const setSoldJokerIdsThisShopVisit = useGame(
    (state) => state.setSoldJokerIdsThisShopVisit,
  );
  const [pendingNextRoundHandSize, setPendingNextRoundHandSize] = useState(0);
  const [pendingDouble, setPendingDouble] = useState(false);
  const consumables = useGame((state) => state.consumables);
  const setConsumables = useGame((state) => state.setConsumables);
  const handSizeModifier = useGame((state) => state.handSizeModifier);
  const setHandSizeModifier = useGame((state) => state.setHandSizeModifier);
  const setExtraPackSlots = useGame((state) => state.setExtraPackSlots);
  const pendingForcedPacks = useGame((state) => state.pendingForcedPacks);
  const setPendingForcedPacks = useGame((state) => state.setPendingForcedPacks);
  const draggingConsumableIndex = useGame(
    (state) => state.draggingConsumableIndex,
  );
  const setDraggingConsumableIndex = useGame(
    (state) => state.setDraggingConsumableIndex,
  );
  const draggingJokerIndex = useGame((state) => state.draggingJokerIndex);
  const setDraggingJokerIndex = useGame((state) => state.setDraggingJokerIndex);
  const openedPack = useGame((state) => state.openedPack);
  const packPicksRemaining = useGame((state) => state.packPicksRemaining);
  const packPreviewHand = useGame((state) => state.packPreviewHand);
  const setPackPreviewHand = useGame((state) => state.setPackPreviewHand);
  const packPreviewSelectedIds = useGame(
    (state) => state.packPreviewSelectedIds,
  );
  const skipTagOffers = useGame((state) => state.skipTagOffers);
  const setSkipTagOffers = useGame((state) => state.setSkipTagOffers);
  useEffect(() => {
    setSkipTagOffers(rollAnteSkipOffers(tagOfferRngConfig.rng));
  }, [setSkipTagOffers]);
  const pendingShopMods = useGame((state) => state.pendingShopMods);
  const setPendingShopMods = useGame((state) => state.setPendingShopMods);
  const setPackPreviewSelectedIds = useGame(
    (state) => state.setPackPreviewSelectedIds,
  );
  const pendingBlindSelect = useGame((state) => state.pendingBlindSelect);
  const setPendingBlindSelect = useGame(
    (state) => state.setPendingBlindSelect,
  );
  const pendingTags = useGame((state) => state.pendingTags);
  const setPendingTags = useGame((state) => state.setPendingTags);
  const ownedVoucherIds = useGame((state) => state.ownedVoucherIds);
  const currentHandSize = Math.max(
    1,
    HAND_SIZE + handSizeModifier + extraHandSize(ownedVoucherIds),
  );
  const extraVoucherSlots = useGame((state) => state.extraVoucherSlots);
  const setExtraVoucherSlots = useGame((state) => state.setExtraVoucherSlots);
  const currentAnteVouchers = useGame((state) => state.currentAnteVouchers);
  const setCurrentAnteVouchers = useGame(
    (state) => state.setCurrentAnteVouchers,
  );
  useEffect(() => {
    setCurrentAnteVouchers(
      pickVouchersForAnte({ ante: 1, ownedIds: new Set() }, BASE_VOUCHER_SLOTS),
    );
  }, [setCurrentAnteVouchers]);
  const soldVoucherIds = useGame((state) => state.soldVoucherIds);
  const currentBoss = useGame((state) => state.currentBoss);
  const setCurrentBoss = useGame((state) => state.setCurrentBoss);
  useEffect(() => {
    setCurrentBoss(pickBossForAnte({ ante: 1 }));
  }, [setCurrentBoss]);
  const recentBossIds = useGame((state) => state.recentBossIds);
  const setRecentBossIds = useGame((state) => state.setRecentBossIds);
  const handHistoryThisRound = useGame((state) => state.handHistoryThisRound);
  const setHandHistoryThisRound = useGame(
    (state) => state.setHandHistoryThisRound,
  );
  const playedCardKeysThisAnte = useGame(
    (state) => state.playedCardKeysThisAnte,
  );
  const setPlayedCardKeysThisAnte = useGame(
    (state) => state.setPlayedCardKeysThisAnte,
  );

  const bossScoreMultiplier = currentBoss.scoreMultiplier;
  const requiredScore =
    blind === 3
      ? BASE_CHIPS[ante - 1] * bossScoreMultiplier
      : BASE_CHIPS[ante - 1] * BLIND_MULTIPLIERS[blind - 1];

  function startNewRound(
    opts: {
      blind?: Blind;
      boss?: BossBlind | null;
      handSizeOverride?: number;
    } = {},
  ) {
    const effectiveBlind = opts.blind ?? blind;
    const effectiveBoss =
      opts.boss !== undefined ? opts.boss : currentBoss;
    const isBossRound = effectiveBlind === 3;
    const baseHandSize =
      (opts.handSizeOverride ?? currentHandSize) + pendingNextRoundHandSize;
    if (pendingNextRoundHandSize !== 0) setPendingNextRoundHandSize(0);
    const startingHands =
      (isBossRound
        ? bossStartingHands(effectiveBoss)
        : DEFAULT_STARTING_HANDS) + extraStartingHands(ownedVoucherIds);
    const startingDiscards =
      (isBossRound
        ? bossStartingDiscards(effectiveBoss)
        : DEFAULT_STARTING_DISCARDS) + extraStartingDiscards(ownedVoucherIds);
    const handSize = isBossRound
      ? bossHandSize(effectiveBoss, baseHandSize)
      : baseHandSize;
    setRoundScore(0);
    setRemainingHands(startingHands);
    setRemainingDiscards(startingDiscards);
    setHandHistoryThisRound([]);
    const fresh = initialDeal(
      destroyedCardKeys,
      handSize,
      addedCards,
      cardEnhancementsByKey,
      cardSealsByKey,
    );
    setDealt({
      hand: applyBossFaceDown(fresh.hand, effectiveBoss, isBossRound, "initial"),
      remaining: fresh.remaining,
    });
    setSelectedIds(new Set());
    setDiscardingIds(new Set());
    setSelectedHand(null);
    setChips(0);
    setMultiplier(0);
    pendingDiscardCountRef.current = 0;
    pendingHandPlayResetRef.current = false;
    skipDrawAfterDiscardRef.current = false;
    setScoringCards([]);
    setScoringIndex(0);
    scoringFinalizeRef.current = null;
    setGoldScoringIds([]);
    setGoldScoringIndex(0);
    goldFinalizeRef.current = null;
    setSteelScoringIds([]);
    setSteelScoringIndex(0);
    steelFinalizeRef.current = null;
    setLuckyMultProcIds(new Set());
    setLuckyMoneyProcIds(new Set());
    setHandLevelSteps([]);
    setHandLevelIndex(0);
    handLevelFinalizeRef.current = null;
    setScoringEvents([]);
    setPendingWin(null);
  }

  useEffect(() => {
    if (scoringCards.length === 0) return;

    if (scoringIndex >= scoringCards.length) {
      const finalize = scoringFinalizeRef.current;
      if (finalize) {
        scoringFinalizeRef.current = null;
        finalize();
      }
      return;
    }

    const stepMs = getScoringStepMs(animationSpeed);
    const timer = window.setTimeout(() => {
      const { card: stepCard, chips: stepChips } = getScoringStep(
        scoringCards,
        scoringIndex,
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
        const key = cardKey(stepCard);
        setDestroyedCardKeys((prev) => {
          if (prev.has(key)) return prev;
          const next = new Set(prev);
          next.add(key);
          return next;
        });
        pushScoringEvent({
          kind: "card-destroyed",
          cardLabel: stepCardLabel,
          source: "Glass roll",
        });
      }
      const luckyResult = applyLuckyRolls(stepCard);
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
        .slice(0, scoringIndex)
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
      setScoringIndex((prev) => prev + 1);
    }, stepMs);
    return () => window.clearTimeout(timer);
  }, [scoringCards, scoringIndex, jokers, animationSpeed]);

  useEffect(() => {
    if (goldScoringIds.length === 0) return;
    if (goldScoringIndex >= goldScoringIds.length) {
      const finalize = goldFinalizeRef.current;
      goldFinalizeRef.current = null;
      setGoldScoringIds([]);
      setGoldScoringIndex(0);
      if (finalize) finalize();
      return;
    }
    const stepMs = getScoringStepMs(animationSpeed);
    const timer = window.setTimeout(() => {
      useGame.getState().earn(GOLD_HELD_BONUS_PER_CARD);
      const goldId = goldScoringIds[goldScoringIndex];
      const goldCard = dealt.hand.find((c) => c.id === goldId);
      pushScoringEvent({
        kind: "money-delta",
        amount: GOLD_HELD_BONUS_PER_CARD,
        source: goldCard
          ? `Gold enhancement: ${cardLabel(goldCard)} held`
          : "Gold enhancement held",
      });
      play("gold");
      setGoldScoringIndex((prev) => prev + 1);
    }, stepMs);
    return () => window.clearTimeout(timer);
  }, [goldScoringIds, goldScoringIndex, animationSpeed, dealt.hand]);

  useEffect(() => {
    if (steelScoringIds.length === 0) return;
    if (steelScoringIndex >= steelScoringIds.length) {
      const finalize = steelFinalizeRef.current;
      steelFinalizeRef.current = null;
      setSteelScoringIds([]);
      setSteelScoringIndex(0);
      if (finalize) finalize();
      return;
    }
    const stepMs = getScoringStepMs(animationSpeed);
    const timer = window.setTimeout(() => {
      setMultiplier((prev) => prev * STEEL_MULT_FACTOR);
      const steelId = steelScoringIds[steelScoringIndex];
      const steelCard = dealt.hand.find((c) => c.id === steelId);
      pushScoringEvent({
        kind: "mult-times",
        factor: STEEL_MULT_FACTOR,
        source: steelCard
          ? `Steel: ${cardLabel(steelCard)} held`
          : "Steel held",
      });
      play("pop");
      setSteelScoringIndex((prev) => prev + 1);
    }, stepMs);
    return () => window.clearTimeout(timer);
  }, [steelScoringIds, steelScoringIndex, animationSpeed, dealt.hand]);

  useEffect(() => {
    if (handLevelSteps.length === 0) return;
    if (handLevelIndex >= handLevelSteps.length) {
      const finalize = handLevelFinalizeRef.current;
      handLevelFinalizeRef.current = null;
      setHandLevelSteps([]);
      setHandLevelIndex(0);
      if (finalize) finalize();
      return;
    }
    const stepMs = getScoringStepMs(animationSpeed);
    const timer = window.setTimeout(() => {
      const step = handLevelSteps[handLevelIndex];
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
      play("pop");
      pulseJokers([step.jokerId]);
      setHandLevelIndex((prev) => prev + 1);
    }, stepMs);
    return () => window.clearTimeout(timer);
  }, [handLevelSteps, handLevelIndex, animationSpeed]);

  const handleWin = useGame((s) => s.handleWin);

  const consumableCapacity =
    MAX_CONSUMABLE_SLOTS + extraConsumableSlots(ownedVoucherIds);

  const openPackOffer = useGame((s) => s.openPackOffer);
  const decrementPackPicks = useGame((s) => s.decrementPackPicks);
  const applySpectralEffect = useGame((s) => s.applySpectralEffect);

  function openTagPack(pool: PackPool, variant: PackVariant) {
    play("pop");
    openPackOffer(
      rollPackForPool(
        pool,
        {
          planetCatalog: availablePlanets(createPlanetCatalog(), handPlayCounts),
          tarotCatalog: createTarotCatalog(),
          jokerCatalog: createJokerCatalog(),
          spectralCatalog: createSpectralCatalog(),
          excludedJokerIds: jokers.map((j) => j.id),
          rng: shopPickerRngConfig.rng,
        },
        variant,
      ),
    );
  }

  function applyEnhancementToSelectedPreviewCards(enhancement: Enhancement) {
    const selectedKeys = new Set<string>();
    for (const c of packPreviewHand) {
      if (packPreviewSelectedIds.has(c.id)) selectedKeys.add(cardKey(c));
    }
    setCardEnhancementsByKey((prev) => {
      const next = new Map(prev);
      for (const key of selectedKeys) next.set(key, enhancement);
      return next;
    });
    setPackPreviewHand((prev) =>
      prev.map((c) =>
        packPreviewSelectedIds.has(c.id) ? { ...c, enhancement } : c,
      ),
    );
    setPackPreviewSelectedIds(new Set());
  }

  function applySealToSelectedPreviewCards(seal: Seal) {
    const selectedKeys = new Set<string>();
    for (const c of packPreviewHand) {
      if (packPreviewSelectedIds.has(c.id)) selectedKeys.add(cardKey(c));
    }
    setCardSealsByKey((prev) => {
      const next = new Map(prev);
      for (const key of selectedKeys) next.set(key, seal);
      return next;
    });
    setPackPreviewHand((prev) =>
      prev.map((c) => (packPreviewSelectedIds.has(c.id) ? { ...c, seal } : c)),
    );
    setPackPreviewSelectedIds(new Set());
  }

  function pickFromOpenedPack(optionIdx: number) {
    if (!openedPack || packPicksRemaining <= 0) return;
    const option = openedPack.options[optionIdx];
    if (!option) return;
    if (option.kind === "planet") {
      play("pop");
      setHandStats((prev) => applyPlanetUpgrade(prev, option.planet));
    } else if (option.kind === "tarot") {
      const effect = option.tarot.effect;
      if (effect.kind === "apply-enhancement") {
        if (packPreviewHand.length === 0) {
          if (!hasFreeConsumableSlot(consumables, consumableCapacity)) return;
          play("pop");
          setConsumables((prev) =>
            addConsumable(prev, { kind: "tarot", card: option.tarot }, consumableCapacity),
          );
        } else {
          if (
            packPreviewSelectedIds.size === 0 ||
            packPreviewSelectedIds.size > effect.maxTargets
          ) {
            return;
          }
          play("pop");
          applyEnhancementToSelectedPreviewCards(effect.enhancement);
        }
      } else if (effect.kind === "money-multiply") {
        play("pop");
        useGame
          .getState()
          .earn(resolveHermitPayout(useGame.getState().money, effect.bonusCap));
      } else if (effect.kind === "joker-sell-value-payout") {
        play("pop");
        useGame.getState().earn(resolveTemperancePayout(jokers, effect.cap));
      } else if (effect.kind === "edition-roll") {
        play("pop");
        const result = rollWheelOfFortune(jokers, effect.chance);
        if (result.hit && result.targetIdx >= 0) {
          setJokers((prev) =>
            prev.map((j, i) => (i === result.targetIdx ? withEdition(j, result.edition) : j)),
          );
        } else {
          triggerNopeAnimation();
        }
      }
    } else if (option.kind === "joker") {
      if (effectiveJokerCount(jokers) >= MAX_JOKERS) return;
      play("pop");
      setJokers((prev) => [...prev, option.joker]);
    } else if (option.kind === "spectral") {
      const effect = option.spectral.effect;
      if (spectralNeedsTarget(effect)) {
        if (!hasFreeConsumableSlot(consumables, consumableCapacity)) return;
        play("pop");
        setConsumables((prev) =>
          addConsumable(prev, { kind: "spectral", card: option.spectral }, consumableCapacity),
        );
      } else {
        play("pop");
        applySpectralEffect(effect);
      }
    } else if (option.kind === "playing-card") {
      play("pop");
      setAddedCards((prev) => [...prev, option.card]);
    } else {
      return;
    }
    decrementPackPicks();
  }

  function togglePackPreviewCard(cardId: number) {
    if (packPreviewHand.length === 0) return;
    setPackPreviewSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }

  const closeOpenedPack = useGame((s) => s.closeOpenedPack);

  const buyShopOfferAction = useGame((s) => s.buyShopOffer);
  const buyShopOffer = (idx: number) => {
    if (buyShopOfferAction(idx)) play("pop");
  };

  function useConsumable(consumableIdx: number) {
    const entry = consumables[consumableIdx];
    if (!entry) return;
    const previewActive = openedPack !== null && packPreviewHand.length > 0;
    if (entry.kind === "planet") {
      play("pop");
      setHandStats((prev) => applyPlanetUpgrade(prev, entry.card));
      setConsumables((prev) => removeConsumableAt(prev, consumableIdx));
      return;
    }
    if (entry.kind === "spectral") {
      const spectralEffect = entry.card.effect;
      if (spectralEffect.kind === "apply-seal") {
        if (previewActive) {
          if (
            packPreviewSelectedIds.size === 0 ||
            packPreviewSelectedIds.size > spectralEffect.maxTargets
          ) {
            return;
          }
          play("pop");
          applySealToSelectedPreviewCards(spectralEffect.seal);
          setConsumables((prev) => removeConsumableAt(prev, consumableIdx));
          return;
        }
        if (selectedIds.size !== spectralEffect.maxTargets) return;
        play("pop");
        setDealt((prev) => ({
          hand: prev.hand.map((c) =>
            selectedIds.has(c.id) ? { ...c, seal: spectralEffect.seal } : c,
          ),
          remaining: prev.remaining,
        }));
        setSelectedIds(new Set());
        setSelectedHand(null);
        setChips(0);
        setMultiplier(0);
        setConsumables((prev) => removeConsumableAt(prev, consumableIdx));
        return;
      }
      if (spectralEffect.kind === "duplicate-selected") {
        if (previewActive) return;
        if (selectedIds.size !== spectralEffect.maxTargets) return;
        play("pop");
        setDealt((prev) => ({
          hand: duplicateSelectedInHand(prev.hand, selectedIds, spectralEffect.copies),
          remaining: prev.remaining,
        }));
        setSelectedIds(new Set());
        setSelectedHand(null);
        setChips(0);
        setMultiplier(0);
        setConsumables((prev) => removeConsumableAt(prev, consumableIdx));
        return;
      }
      play("pop");
      applySpectralEffect(spectralEffect);
      setConsumables((prev) => removeConsumableAt(prev, consumableIdx));
      return;
    }
    const effect = entry.card.effect;
    if (effect.kind === "money-multiply") {
      play("pop");
      useGame
        .getState()
        .earn(resolveHermitPayout(useGame.getState().money, effect.bonusCap));
      setConsumables((prev) => removeConsumableAt(prev, consumableIdx));
      return;
    }
    if (effect.kind === "joker-sell-value-payout") {
      play("pop");
      useGame.getState().earn(resolveTemperancePayout(jokers, effect.cap));
      setConsumables((prev) => removeConsumableAt(prev, consumableIdx));
      return;
    }
    if (effect.kind === "edition-roll") {
      play("pop");
      const result = rollWheelOfFortune(jokers, effect.chance);
      if (result.hit && result.targetIdx >= 0) {
        setJokers((prev) =>
          prev.map((j, i) => (i === result.targetIdx ? withEdition(j, result.edition) : j)),
        );
      } else {
        triggerNopeAnimation();
      }
      setConsumables((prev) => removeConsumableAt(prev, consumableIdx));
      return;
    }
    if (previewActive) {
      if (
        packPreviewSelectedIds.size === 0 ||
        packPreviewSelectedIds.size > effect.maxTargets
      ) {
        return;
      }
      play("pop");
      applyEnhancementToSelectedPreviewCards(effect.enhancement);
      setConsumables((prev) => removeConsumableAt(prev, consumableIdx));
      return;
    }
    if (selectedIds.size === 0 || selectedIds.size > effect.maxTargets) return;
    play("pop");
    setDealt((prev) => ({
      hand: prev.hand.map((c) =>
        selectedIds.has(c.id) ? { ...c, enhancement: effect.enhancement } : c,
      ),
      remaining: prev.remaining,
    }));
    setSelectedIds(new Set());
    setSelectedHand(null);
    setChips(0);
    setMultiplier(0);
    setConsumables((prev) => removeConsumableAt(prev, consumableIdx));
  }

  const sellConsumableAction = useGame((s) => s.sellConsumable);
  const sellConsumable = (consumableIdx: number) => {
    play("pop");
    sellConsumableAction(consumableIdx);
  };
  const sellJokerAction = useGame((s) => s.sellJoker);
  const sellJoker = (jokerIdx: number) => {
    play("pop");
    sellJokerAction(jokerIdx);
  };

  const draggingConsumable =
    draggingConsumableIndex !== null
      ? consumables[draggingConsumableIndex] ?? null
      : null;
  const canDropDraggedConsumableOnJokers =
    draggingConsumable !== null &&
    consumableUseBlock(draggingConsumable, selectedIds.size) === null;
  const onConsumableDrop = (action: (idx: number) => void) => () => {
    const idx = draggingConsumableIndex;
    if (idx === null) return;
    setDraggingConsumableIndex(null);
    action(idx);
  };
  const onJokerDrop = (action: (idx: number) => void) => () => {
    const idx = draggingJokerIndex;
    if (idx === null) return;
    setDraggingJokerIndex(null);
    action(idx);
  };

  const rerollShopOffersAction = useGame((s) => s.rerollShopOffers);
  const rerollShopOffers = (cost: number) => {
    if (!shopOffers) return;
    if (money < cost) return;
    play("pop");
    rerollShopOffersAction(cost);
  };

  function closeShopAndStartNextRound() {
    setShopOffers(null);
    setSoldJokerIdsThisShopVisit([]);
    setPendingShopMods([]);
    setPendingBlindSelect(true);
  }

  function confirmBlindSelect() {
    setPendingBlindSelect(false);
    startNewRound();
  }

  function applyGainedTag(tagId: TagId, nextStats: RunStats) {
    const effect = resolveTagEffect(tagId);
    if (effect.category === "immediate") {
      const action = effect.action;
      if (action.kind === "open-pack") {
        openTagPack(action.pool, action.variant);
      } else if (action.kind === "create-jokers") {
        play("pop");
        const capacity = MAX_JOKERS + extraJokerSlots(ownedVoucherIds);
        setJokers((prev) => {
          let next = prev;
          for (let i = 0; i < action.count; i += 1) {
            const joker = createJokerByRarity(
              next,
              createJokerCatalog(),
              action.rarity,
              capacity,
              shopPickerRngConfig.rng,
            );
            if (joker) next = [...next, joker];
          }
          return next;
        });
      } else if (action.kind === "reroll-boss") {
        play("pop");
        setCurrentBoss(
          pickBossForAnte({
            ante,
            recentIds: new Set<string>([...recentBossIds, currentBoss.id]),
            rng: bossPickerRngConfig.rng,
          }),
        );
      } else if (action.kind === "upgrade-hand") {
        play("pop");
        const planets = createPlanetCatalog();
        const planet = planets[Math.floor(shopPickerRngConfig.rng() * planets.length)];
        setHandStats((prev) => {
          let next = prev;
          for (let i = 0; i < action.levels; i += 1) {
            next = applyPlanetUpgrade(next, planet);
          }
          return next;
        });
      } else {
        const economy = useGame.getState();
        economy.earn(
          immediateMoneyGain(action, { stats: nextStats, money: economy.money }),
        );
      }
      return;
    }
    setPendingTags((prev) => [...prev, tagId]);
    if (effect.category === "next-shop") {
      setPendingShopMods((prev) => [...prev, ...effect.modifiers]);
    } else if (effect.category === "next-round") {
      setPendingNextRoundHandSize((prev) => prev + effect.handSizeBonus);
    }
  }

  function skipBlind() {
    if (blind === 3) return;
    const offered = blind === 1 ? skipTagOffers.small : skipTagOffers.big;
    const effect = resolveTagEffect(offered);
    const nextStats = recordBlindSkipped(runStats);
    setBlind((prev) => (prev + 1) as Blind);
    setRound((prev) => prev + 1);
    setRunStats(nextStats);
    if (effect.category === "duplicate-next") {
      setPendingTags((prev) => [...prev, offered]);
      setPendingDouble(true);
      return;
    }
    const times = pendingDouble ? 2 : 1;
    if (pendingDouble) setPendingDouble(false);
    for (let i = 0; i < times; i += 1) applyGainedTag(offered, nextStats);
  }

  function adjustVoucherSlots(delta: number) {
    const nextExtra = Math.max(-BASE_VOUCHER_SLOTS, extraVoucherSlots + delta);
    if (nextExtra === extraVoucherSlots) return;
    setExtraVoucherSlots(nextExtra);
    const nextCount = BASE_VOUCHER_SLOTS + nextExtra;
    setCurrentAnteVouchers((prev) => {
      if (nextCount === 0) return [];
      if (nextCount <= prev.length) return prev.slice(0, nextCount);
      const existingIds = new Set(prev.map((v) => v.id));
      const additional = pickVouchersForAnte(
        {
          ante,
          ownedIds: ownedVoucherIds,
          excludeIds: new Set<VoucherId>([...ownedVoucherIds, ...existingIds]),
        },
        nextCount - prev.length,
      );
      return [...prev, ...additional];
    });
  }

  const buyAnteVoucherAction = useGame((s) => s.buyAnteVoucher);
  const buyAnteVoucher = (voucherIdx: number) => {
    const voucher = currentAnteVouchers[voucherIdx];
    if (!voucher) return;
    if (soldVoucherIds.has(voucher.id)) return;
    if (money < voucher.cost) return;
    if (voucher.requires && !ownedVoucherIds.has(voucher.requires)) return;
    play("pop");
    buyAnteVoucherAction(voucherIdx);
  };

  const reorderJokers = useGame((s) => s.reorderJokers);

  function startNewGame(): void {
    setBlind(1);
    setRound(1);
    setAnte(1);
    useGame.getState().resetEconomy();
    setHandSizeModifier(0);
    setPendingNextRoundHandSize(0);
    setPendingDouble(false);
    setExtraPackSlots(0);
    setPendingForcedPacks([]);
    setDevChipsBonus(0);
    setDevMultBonus(0);
    setDevMultFactor(1);
    setForceProbabilities(false);
    setJokers(initialJokersConfig.factory());
    useGame.getState().resetStats();
    setDestroyedCardKeys(new Set());
    setAddedCards([]);
    setCardEnhancementsByKey(new Map());
    setConsumables([]);
    useGame.getState().resetVouchers();
    setCurrentAnteVouchers(
      pickVouchersForAnte({ ante: 1, ownedIds: new Set() }, BASE_VOUCHER_SLOTS),
    );
    setRecentBossIds(new Set());
    const freshBoss = pickBossForAnte({
      ante: 1,
      rng: bossPickerRngConfig.rng,
    });
    setCurrentBoss(freshBoss);
    setPendingTags([]);
    setRunStats(initialRunStats());
    setSkipTagOffers(rollAnteSkipOffers(tagOfferRngConfig.rng));
    setPendingShopMods([]);
    setPlayedCardKeysThisAnte(new Set());
    setHandHistoryThisRound([]);
    setPendingBlindSelect(true);
  }

  function addChips(amount: number) {
    play("pop");
    setDevChipsBonus((prev) => prev + amount);
  }

  function addMultiplier(amount: number) {
    play("pop");
    setDevMultBonus((prev) => prev + amount);
  }

  function multiplyMultiplier(factor: number) {
    play("pop");
    setDevMultFactor((prev) => prev * factor);
  }

  function loseGame() {
    play("lose");
    alert("Game Over! Try again.");
    startNewGame();
  }

  function toggleCard(card: Card) {
    if (discardingIds.size > 0) return;
    if (isScoring) return;
    let nextIds: Set<number>;
    if (selectedIds.has(card.id)) {
      nextIds = new Set(selectedIds);
      nextIds.delete(card.id);
    } else {
      if (selectedIds.size >= MAX_SELECTED) return;
      nextIds = new Set(selectedIds);
      nextIds.add(card.id);
    }
    setSelectedIds(nextIds);
    if (nextIds.size === 0) {
      setSelectedHand(null);
      setChips(0);
      setMultiplier(0);
      return;
    }
    const nextSelected = dealt.hand.filter((c) => nextIds.has(c.id));
    const label = detectHandLabel(nextSelected);
    const entry =
      blind === 3
        ? bossAdjustHandEntry(currentBoss, label, handStats[label])
        : handStats[label];
    const hand: Hand = { label, chips: entry.chips, multiplier: entry.multiplier };
    setSelectedHand(hand);
    setChips(entry.chips);
    setMultiplier(entry.multiplier);
  }

  function finalizeDiscard(idsToDiscard: ReadonlySet<number>) {
    const kept = dealt.hand.filter((c) => !idsToDiscard.has(c.id));
    if (skipDrawAfterDiscardRef.current) {
      skipDrawAfterDiscardRef.current = false;
      setDealt({ hand: kept, remaining: dealt.remaining });
    } else {
      const effectiveHandSize =
        blind === 3 ? bossHandSize(currentBoss, currentHandSize) : currentHandSize;
      const drawCount = drawCountForRefill(
        effectiveHandSize,
        kept.length,
        dealt.remaining.length,
      );
      const drawn = dealt.remaining.slice(0, drawCount);
      const newRemaining = dealt.remaining.slice(drawCount);
      const drawnWithFaceDown = applyBossFaceDown(
        drawn,
        currentBoss,
        blind === 3,
        "refill",
      );
      setDealt({ hand: [...kept, ...drawnWithFaceDown], remaining: newRemaining });
    }
    setSelectedIds(new Set());
    setDiscardingIds(new Set());
    setSelectedHand(null);
    setChips(0);
    setMultiplier(0);
    if (pendingHandPlayResetRef.current) {
      pendingHandPlayResetRef.current = false;
      setHandPlaySignal((prev) => prev + 1);
    }
  }

  function handleCardDiscardEnd(card: Card) {
    if (!discardingIds.has(card.id)) return;
    pendingDiscardCountRef.current -= 1;
    if (pendingDiscardCountRef.current <= 0) {
      pendingDiscardCountRef.current = 0;
      finalizeDiscard(discardingIds);
    }
  }

  function submitHand() {
    if (discardingIds.size > 0) return;
    if (isScoring) return;

    const handById = new Map(dealt.hand.map((c) => [c.id, c]));
    const playedCards = handDisplayOrder
      .map((id) => handById.get(id))
      .filter((c): c is Card => c !== undefined && selectedIds.has(c.id));
    const submittedSelection = selectedIds;

    if (playedCards.length === 0) {
      // Empty submission: no scoring sequence, finalize directly.
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

    const label = detectHandLabel(playedCards);
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
      getScoringCards(playedCards, label),
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
    const handJokerResult = applyHandLevelJokers(jokers, {
      playedHandLabel: label,
      playedCardCount: playedCards.length,
      scoredCards: scoring,
      remainingDiscards,
      money,
      heldInHandCards: getHeldInHand(dealt.hand, submittedSelection),
    });

    let perCardAdditiveMult = 0;
    let perCardAdditiveChips = 0;
    let perCardXMult = 1;
    let firstFaceAlreadyScoredUpfront = false;
    for (let i = 0; i < scoring.length; i += 1) {
      const perCard = applyPerCardJokers(jokers, scoring[i], Math.random, {
        firstFaceAlreadyScored: firstFaceAlreadyScoredUpfront,
      });
      perCardAdditiveMult += perCard.additiveMult;
      perCardAdditiveChips += perCard.additiveChips;
      perCardAdditiveMult += getCardMultDelta(scoring[i]);
      perCardXMult *= perCard.xMult;
      if (isFaceCard(scoring[i])) firstFaceAlreadyScoredUpfront = true;
    }

    const heldSteelIds = dealt.hand
      .filter((c) => c.enhancement === "steel" && !submittedSelection.has(c.id))
      .map((c) => c.id);
    const steelMult = steelHeldMultiplier(dealt.hand, submittedSelection);
    const enhancementXMult = scoring.reduce(
      (m, card) => m * applyCardEnhancement(card).multTimes,
      1,
    );
    const preHandXMultNoSteel = handJokerResult.xMult * enhancementXMult * perCardXMult;
    const totalXMult = preHandXMultNoSteel * steelMult;

    // Inline the same arithmetic computeFinalScoreWithJokers does so we can
    // fold the dev Apply Modifiers offsets in at the same place. Bumps that
    // were displayed during the round now actually move the round score.
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

    // Steel ×1.5 animates per-card during the steel sequence; hand-level
    // jokers now animate after steel, so the starting live multiplier omits
    // both of those factors.
    const liveMultiplier = handEntry.multiplier * enhancementXMult;
    setChips(handEntry.chips);
    setMultiplier(liveMultiplier);

    const finalize = () => {
      finalizeHandSubmission(finalScore, submittedSelection, label);
    };
    const runHandLevel = () => {
      if (handJokerResult.steps.length === 0) {
        finalize();
        return;
      }
      handLevelFinalizeRef.current = finalize;
      setHandLevelSteps(handJokerResult.steps);
      setHandLevelIndex(0);
    };
    scoringFinalizeRef.current = () => {
      if (heldSteelIds.length === 0) {
        runHandLevel();
        return;
      }
      steelFinalizeRef.current = runHandLevel;
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

  function finalizeHandSubmission(
    score: number,
    submittedSelection: ReadonlySet<number>,
    playedHandLabel: HandLabel | null = null,
  ) {
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
      const heldGoldIds = dealt.hand
        .filter((c) => c.enhancement === "gold" && !submittedSelection.has(c.id))
        .map((c) => c.id);
      const remainingHandsCount = Math.max(0, remainingHands - 1);
      const remainingHandsBonus = remainingHandsCount * REMAINING_HAND_BONUS;
      const postGoldWallet = money + heldGoldIds.length * GOLD_HELD_BONUS_PER_CARD;
      const postBonusesWallet = postGoldWallet + remainingHandsBonus;
      const openModal = () => {
        play("win");
        if (remainingHandsBonus > 0) {
          useGame.getState().earn(remainingHandsBonus);
          pushScoringEvent({
            kind: "money-delta",
            amount: remainingHandsBonus,
            source: `Remaining hands × $${REMAINING_HAND_BONUS}`,
          });
        }
        setPendingWin({
          roundScore: newRoundScore,
          requiredScore,
          baseReward: blind + 2,
          walletAtPayout: postBonusesWallet,
          interestWallet: postGoldWallet,
          interest: calculateInterest(
            postGoldWallet,
            interestCapFor(ownedVoucherIds),
          ),
          goldHeldCount: heldGoldIds.length,
          remainingHandsCount,
        });
      };
      if (heldGoldIds.length === 0) {
        openModal();
        return;
      }
      goldFinalizeRef.current = openModal;
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

  function dismissRoundWonModal() {
    const precomputed = pendingWin
      ? { interest: pendingWin.interest, interestWallet: pendingWin.interestWallet }
      : undefined;
    setPendingWin(null);
    handleWin(precomputed);
  }

  function discardSelected() {
    if (discardingIds.size > 0) return;
    if (selectedIds.size === 0) return;
    if (remainingDiscards <= 0) return;

    const purpleDiscards = purpleSealDiscarded(dealt.hand, selectedIds);
    if (purpleDiscards.length > 0) {
      setConsumables((prev) => {
        let next = prev;
        for (let i = 0; i < purpleDiscards.length; i += 1) {
          const after = addConsumable(
            next,
            { kind: "tarot", card: pickRandomTarot() },
            consumableCapacity,
          );
          if (after === next) break;
          next = after;
        }
        return next;
      });
    }

    pendingDiscardCountRef.current = selectedIds.size;
    setDiscardingIds(selectedIds);
    setRemainingDiscards((prev) => prev - 1);
  }

  const appStyle = hasUserOverriddenAnimationSpeed(animationSpeed)
    ? ({
        "--animation-speed": String(getAnimationSpeedMultiplier(animationSpeed)),
      } as React.CSSProperties)
    : undefined;

  return (
    <div
      className={`App ${highVisibility ? "high-visibility" : ""}`.trim()}
      style={appStyle}
      data-hands-played={runStats.handsPlayed}
      data-unused-discards={runStats.unusedDiscards}
      data-blinds-skipped={runStats.blindsSkipped}
    >
      <Sidebar
        blind={blind}
        ante={ante}
        round={round}
        money={money}
        chips={chips + devChipsBonus}
        multiplier={(multiplier + devMultBonus) * devMultFactor}
        roundScore={roundScore}
        requiredScore={requiredScore}
        selectedHand={selectedHand}
        remainingHands={remainingHands}
        remainingDiscards={remainingDiscards}
        handPlayCounts={handPlayCounts}
        handStats={handStats}
        ownedVouchers={VOUCHER_CATALOG.filter((v) => ownedVoucherIds.has(v.id))}
        currentBoss={currentBoss}
        scoringEvents={scoringEvents}
        onNewGame={startNewGame}
      />
      <Game
        onWin={handleWin}
        onAddChips={addChips}
        onAddMultiplier={addMultiplier}
        onMultiplyMultiplier={multiplyMultiplier}
        onAdjustMoney={(delta) => {
          const economy = useGame.getState();
          economy.setMoney(economy.money + delta);
        }}
        onSubmitHand={submitHand}
        onDiscard={discardSelected}
        canSubmit={(() => {
          if (
            blind === 3 &&
            selectedHand !== null &&
            bossBlocksHandLabel(
              currentBoss,
              selectedHand.label as HandLabel,
              handHistoryThisRound,
            )
          ) {
            return false;
          }
          return true;
        })()}
        canDiscard={
          selectedIds.size > 0 &&
          remainingDiscards > 0 &&
          discardingIds.size === 0 &&
          !isScoring
        }
        isScoring={isScoring}
        scoringId={currentScoringId}
        scoringPulseTick={scoringIndex}
        goldScoringId={currentGoldScoringId}
        steelScoringId={currentSteelScoringId}
        luckyMultProcIds={luckyMultProcIds}
        luckyMoneyProcIds={luckyMoneyProcIds}
        handPlaySignal={handPlaySignal}
        hand={dealt.hand}
        remaining={dealt.remaining}
        selectedIds={selectedIds}
        discardingIds={discardingIds}
        debuffedIds={debuffedHandIds(
          dealt.hand,
          currentBoss,
          blind === 3,
          playedCardKeysThisAnte,
        )}
        jokers={jokers}
        jokerPulseCounters={jokerPulseCounters}
        consumables={consumables}
        consumableCapacity={consumableCapacity}
        onUseConsumable={useConsumable}
        onSellConsumable={sellConsumable}
        onConsumableDragStart={setDraggingConsumableIndex}
        onConsumableDragEnd={() => setDraggingConsumableIndex(null)}
        draggingConsumableIndex={draggingConsumableIndex}
        canDropDraggedConsumableOnJokers={canDropDraggedConsumableOnJokers}
        onConsumableDropOnJokers={onConsumableDrop(useConsumable)}
        onConsumableDropOnDeck={onConsumableDrop(sellConsumable)}
        draggingJokerIndex={draggingJokerIndex}
        onJokerDragStart={setDraggingJokerIndex}
        onJokerDragEnd={() => setDraggingJokerIndex(null)}
        onSellJoker={sellJoker}
        onJokerDropOnDeck={onJokerDrop(sellJoker)}
        onShrinkHandSize={() => setHandSizeModifier((prev) => prev - 1)}
        onGrowHandSize={() => setHandSizeModifier((prev) => prev + 1)}
        onShrinkPackSlots={() =>
          setExtraPackSlots((prev) => Math.max(-SHOP_PACK_SLOTS, prev - 1))
        }
        onGrowPackSlots={() => setExtraPackSlots((prev) => prev + 1)}
        onQueueForcedPack={(pool) =>
          setPendingForcedPacks((prev) => [...prev, pool])
        }
        onClearPendingPacks={() => setPendingForcedPacks([])}
        pendingForcedPacks={pendingForcedPacks}
        onShrinkVoucherSlots={() => adjustVoucherSlots(-1)}
        onGrowVoucherSlots={() => adjustVoucherSlots(1)}
        forceProbabilities={forceProbabilities}
        onToggleForceProbabilities={() => setForceProbabilities((p) => !p)}
        shop={
          shopOffers
            ? {
                money,
                equippedJokerCount: effectiveJokerCount(jokers),
                consumableCount: consumables.length,
                consumableCapacity,
                offers: shopOffers,
                vouchers: currentAnteVouchers,
                soldVoucherIds,
                ownedVoucherIds,
                onBuy: buyShopOffer,
                onBuyVoucher: buyAnteVoucher,
                onReroll: rerollShopOffers,
                onNext: closeShopAndStartNextRound,
                extraRerollReduction:
                  applyNextShopModifiers(pendingShopMods).rerollReduction,
                voucherOptions: VOUCHER_CATALOG,
                onSetVoucher: (id) => {
                  const next = VOUCHER_CATALOG.find((v) => v.id === id);
                  if (next) setCurrentAnteVouchers([next]);
                },
              }
            : undefined
        }
        packOpen={
          openedPack
            ? {
                pack: openedPack,
                picksRemaining: packPicksRemaining,
                consumableSlotsFull: !hasFreeConsumableSlot(
                  consumables,
                  consumableCapacity,
                ),
                jokerSlotsFull: effectiveJokerCount(jokers) >= MAX_JOKERS,
                previewHand: packPreviewHand,
                previewSelectedIds: packPreviewSelectedIds,
                onSelectPreviewCard: togglePackPreviewCard,
                onPick: pickFromOpenedPack,
                onClose: closeOpenedPack,
              }
            : undefined
        }
        onToggleCard={toggleCard}
        onCardDiscardEnd={handleCardDiscardEnd}
        onDisplayOrderChange={setHandDisplayOrder}
        onReorderJokers={reorderJokers}
      />
      <NopeAnimation triggerKey={nopeTriggerKey} />
      {pendingWin && (
        <RoundWonModal info={pendingWin} onContinue={dismissRoundWonModal} />
      )}
      {pendingBlindSelect && (
        <BlindSelectScreen
          ante={ante}
          currentBlind={blind}
          boss={currentBoss}
          onPlay={confirmBlindSelect}
          onSkip={skipBlind}
          tags={pendingTags}
          skipRewards={skipTagOffers}
          bossOptions={availableBosses(createBossCatalog(), ante)}
          onSetBoss={(id) => {
            const next = createBossCatalog().find((b) => b.id === id);
            if (next) setCurrentBoss(next);
          }}
        />
      )}
    </div>
  );
}

export default App;
