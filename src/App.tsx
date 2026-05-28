import { useEffect, useRef, useState } from "react";
import "./App.css";
import type { Blind, Card, Enhancement, Hand, Seal } from "./cards/types";
import { BASE_CHIPS, BLIND_MULTIPLIERS, BlindValues } from "./constants";
import {
  DEFAULT_STARTING_DISCARDS,
  DEFAULT_STARTING_HANDS,
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
import RoundWonModal, { type RoundWonInfo } from "./components/game/RoundWonModal";
import { packPickLimit, type PackOffer, type PackPool } from "./items/packs";
import BlindSelectScreen from "./components/game/BlindSelectScreen";
import { totalTagPayout, type TagId } from "./items/tags";
import { applyPlanetUpgrade, availablePlanets, createPlanetCatalog } from "./items/planets";
import {
  createSpectralCatalog,
  transmuteHand,
  type SpectralEffect,
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
  consumableSellValue,
  consumableUseBlock,
  hasFreeConsumableSlot,
  removeConsumableAt,
  type Consumable,
} from "./items/consumables";
import Sidebar from "./components/hud/Sidebar";
import {
  emptyHandCounts,
  type HandPlayCounts,
} from "./components/hud/RunInfo";
import { play } from "./components/system/sounds";
import {
  getAnimationSpeed,
  getAnimationSpeedMultiplier,
  hasUserOverriddenAnimationSpeed,
  isHighVisibility,
  type AnimationSpeed,
} from "./components/system/preferences";
import { detectHandLabel, type HandLabel } from "./scoring/handEvaluator";
import { createDefaultHandStats, type HandStats } from "./scoring/handStats";
import {
  getCardChips,
  getCardMultDelta,
  getRankChips,
  getScoringCards,
  getScoringStep,
} from "./scoring/scoring";
import { cardLabel, type ScoringEvent } from "./scoring/scoringTrace";
import {
  cardKey,
  createDeck,
  deal,
  drawCountForRefill,
  shuffle,
  HAND_SIZE,
  SUITS,
  type DealResult,
} from "./cards/deck";
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
  createJokerCatalog,
  effectiveJokerCount,
  initialJokersConfig,
  isFaceCard,
  jokerSellValue,
  withEdition,
  type Joker,
  type JokerHandLevelStep,
} from "./items/jokers";
import {
  SHOP_PACK_SLOTS,
  pickShopItemOffers,
  pickShopOffers,
  pickSingleShopOffer,
  shopPickerRngConfig,
  type ShopItem,
} from "./items/shop";
import {
  applyShopDiscount,
  extraConsumableSlots,
  extraShopOfferSlots,
  pickVouchersForAnte,
  VOUCHER_CATALOG,
  type Voucher,
  type VoucherId,
} from "./items/vouchers";

export const BASE_VOUCHER_SLOTS = 1;

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

function applyEnhancementOverrides(
  cards: ReadonlyArray<Card>,
  overrides: ReadonlyMap<string, Enhancement>,
): Card[] {
  return cards.map((c) => {
    if (c.enhancement !== undefined) return c;
    const override = overrides.get(cardKey(c));
    return override === undefined ? c : { ...c, enhancement: override };
  });
}

function applySealOverrides(
  cards: ReadonlyArray<Card>,
  overrides: ReadonlyMap<string, Seal>,
): Card[] {
  return cards.map((c) => {
    if (c.seal !== undefined && c.seal !== null) return c;
    const override = overrides.get(cardKey(c));
    return override === undefined ? c : { ...c, seal: override };
  });
}

function initialDeal(
  excludedKeys: ReadonlySet<string> = new Set(),
  handSize: number = HAND_SIZE,
  addedCards: ReadonlyArray<Card> = [],
  enhancementOverrides: ReadonlyMap<string, Enhancement> = new Map(),
  sealOverrides: ReadonlyMap<string, Seal> = new Map(),
): DealResult {
  const base = applySealOverrides(
    applyEnhancementOverrides(createDeck(excludedKeys), enhancementOverrides),
    sealOverrides,
  );
  const extras = applySealOverrides(
    applyEnhancementOverrides(addedCards, enhancementOverrides),
    sealOverrides,
  );
  return deal(
    shuffle([...base, ...extras]),
    Math.max(1, handSize),
  );
}

function App() {
  const [blind, setBlind] = useState<Blind>(1);
  const [round, setRound] = useState(1);
  const [ante, setAnte] = useState(1);
  const [money, setMoney] = useState(4);
  const [chips, setChips] = useState(0);
  const [multiplier, setMultiplier] = useState(0);
  // Dev "Apply modifiers" offsets. Sticky across selection/scoring/finalize
  // so the displayed chips/multiplier reflect manual bumps until a New game
  // resets them. See #265.
  const [devChipsBonus, setDevChipsBonus] = useState(0);
  const [devMultBonus, setDevMultBonus] = useState(0);
  const [devMultFactor, setDevMultFactor] = useState(1);
  const [forceProbabilities, setForceProbabilities] = useState(false);
  useEffect(() => {
    chanceOverrideConfig.force100 = forceProbabilities;
    return () => {
      chanceOverrideConfig.force100 = false;
    };
  }, [forceProbabilities]);
  const [roundScore, setRoundScore] = useState(0);
  const [selectedHand, setSelectedHand] = useState<Hand | null>(null);
  const [remainingHands, setRemainingHands] = useState(4);
  const [remainingDiscards, setRemainingDiscards] = useState(3);
  const [dealt, setDealt] = useState<DealResult>(initialDeal);
  const [highVisibility, setHighVisibility] = useState<boolean>(isHighVisibility);
  const [animationSpeed, setAnimationSpeedState] = useState<AnimationSpeed>(
    getAnimationSpeed,
  );
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [discardingIds, setDiscardingIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [handDisplayOrder, setHandDisplayOrder] = useState<ReadonlyArray<number>>(
    [],
  );
  const [jokers, setJokers] = useState<ReadonlyArray<Joker>>(() =>
    initialJokersConfig.factory(),
  );
  const [jokerPulseCounters, setJokerPulseCounters] = useState<
    Readonly<Record<string, number>>
  >({});
  const [handPlayCounts, setHandPlayCounts] = useState<HandPlayCounts>(
    emptyHandCounts,
  );
  const [handStats, setHandStats] = useState<HandStats>(createDefaultHandStats);
  const pendingDiscardCountRef = useRef(0);
  const pendingHandPlayResetRef = useRef(false);
  const [handPlaySignal, setHandPlaySignal] = useState(0);
  const skipDrawAfterDiscardRef = useRef(false);
  const [destroyedCardKeys, setDestroyedCardKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [scoringEvents, setScoringEvents] = useState<ReadonlyArray<ScoringEvent>>(
    [],
  );

  function pushScoringEvent(event: ScoringEvent) {
    setScoringEvents((prev) => [...prev, event]);
  }
  const [addedCards, setAddedCards] = useState<ReadonlyArray<Card>>(() => []);
  const [cardEnhancementsByKey, setCardEnhancementsByKey] = useState<
    ReadonlyMap<string, Enhancement>
  >(() => new Map());
  const [cardSealsByKey, setCardSealsByKey] = useState<
    ReadonlyMap<string, Seal>
  >(() => new Map());

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
  const [scoringCards, setScoringCards] = useState<ReadonlyArray<Card>>([]);
  const [scoringIndex, setScoringIndex] = useState<number>(0);
  const scoringFinalizeRef = useRef<(() => void) | null>(null);
  const isScoring = scoringCards.length > 0 && scoringIndex < scoringCards.length;
  const currentScoringId = isScoring ? scoringCards[scoringIndex].id : null;

  const [goldScoringIds, setGoldScoringIds] = useState<ReadonlyArray<number>>([]);
  const [goldScoringIndex, setGoldScoringIndex] = useState<number>(0);
  const goldFinalizeRef = useRef<(() => void) | null>(null);
  const currentGoldScoringId =
    goldScoringIds.length > 0 && goldScoringIndex < goldScoringIds.length
      ? goldScoringIds[goldScoringIndex]
      : null;

  const [steelScoringIds, setSteelScoringIds] = useState<ReadonlyArray<number>>([]);
  const [steelScoringIndex, setSteelScoringIndex] = useState<number>(0);
  const steelFinalizeRef = useRef<(() => void) | null>(null);
  const currentSteelScoringId =
    steelScoringIds.length > 0 && steelScoringIndex < steelScoringIds.length
      ? steelScoringIds[steelScoringIndex]
      : null;

  const [luckyMultProcIds, setLuckyMultProcIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [luckyMoneyProcIds, setLuckyMoneyProcIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  );

  const [handLevelSteps, setHandLevelSteps] = useState<
    ReadonlyArray<JokerHandLevelStep>
  >([]);
  const [handLevelIndex, setHandLevelIndex] = useState<number>(0);
  const handLevelFinalizeRef = useRef<(() => void) | null>(null);

  // Round-won modal: when non-null, the player has met the required score and
  // the modal is showing. Dismissal triggers handleWin().
  const [pendingWin, setPendingWin] = useState<RoundWonInfo | null>(null);

  const [shopOffers, setShopOffers] = useState<ReadonlyArray<ShopItem> | null>(
    null,
  );
  const [soldJokerIdsThisShopVisit, setSoldJokerIdsThisShopVisit] = useState<
    ReadonlyArray<string>
  >([]);
  const [consumables, setConsumables] = useState<ReadonlyArray<Consumable>>([]);
  const [handSizeModifier, setHandSizeModifier] = useState(0);
  const currentHandSize = Math.max(1, HAND_SIZE + handSizeModifier);
  const [extraPackSlots, setExtraPackSlots] = useState(0);
  const [pendingForcedPacks, setPendingForcedPacks] = useState<
    ReadonlyArray<PackPool>
  >([]);
  const [draggingConsumableIndex, setDraggingConsumableIndex] = useState<
    number | null
  >(null);
  const [draggingJokerIndex, setDraggingJokerIndex] = useState<number | null>(
    null,
  );
  const [openedPack, setOpenedPack] = useState<PackOffer | null>(null);
  const [packPicksRemaining, setPackPicksRemaining] = useState(0);
  const [packPreviewHand, setPackPreviewHand] = useState<ReadonlyArray<Card>>(
    [],
  );
  const [packPreviewSelectedIds, setPackPreviewSelectedIds] = useState<
    ReadonlySet<number>
  >(() => new Set());
  const [pendingBlindSelect, setPendingBlindSelect] = useState(true);
  const [pendingTags, setPendingTags] = useState<ReadonlyArray<TagId>>([]);
  const [ownedVoucherIds, setOwnedVoucherIds] = useState<ReadonlySet<VoucherId>>(
    () => new Set(),
  );
  const [extraVoucherSlots, setExtraVoucherSlots] = useState(0);
  const [currentAnteVouchers, setCurrentAnteVouchers] = useState<
    ReadonlyArray<Voucher>
  >(() =>
    pickVouchersForAnte(
      { ante: 1, ownedIds: new Set() },
      BASE_VOUCHER_SLOTS,
    ),
  );
  const [soldVoucherIds, setSoldVoucherIds] = useState<ReadonlySet<VoucherId>>(
    () => new Set(),
  );
  const [currentBoss, setCurrentBoss] = useState<BossBlind>(() =>
    pickBossForAnte({ ante: 1 }),
  );
  const [recentBossIds, setRecentBossIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [handHistoryThisRound, setHandHistoryThisRound] = useState<
    ReadonlyArray<HandLabel>
  >([]);
  const [playedCardKeysThisAnte, setPlayedCardKeysThisAnte] = useState<
    ReadonlySet<string>
  >(() => new Set());

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
    const baseHandSize = opts.handSizeOverride ?? currentHandSize;
    const startingHands = isBossRound
      ? bossStartingHands(effectiveBoss)
      : DEFAULT_STARTING_HANDS;
    const startingDiscards = isBossRound
      ? bossStartingDiscards(effectiveBoss)
      : DEFAULT_STARTING_DISCARDS;
    const handSize = isBossRound
      ? bossHandSize(effectiveBoss, baseHandSize)
      : baseHandSize;
    setRoundScore(0);
    setRemainingHands(startingHands);
    setRemainingDiscards(startingDiscards);
    setHandHistoryThisRound([]);
    setDealt(
      initialDeal(
        destroyedCardKeys,
        handSize,
        addedCards,
        cardEnhancementsByKey,
        cardSealsByKey,
      ),
    );
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
        setMoney((prev) => prev + luckyResult.moneyBonus);
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
        setMoney((prev) => prev + sealMoney);
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
        setMoney((prev) => prev + cardJokerResult.moneyEarned);
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
      setMoney((prev) => prev + GOLD_HELD_BONUS_PER_CARD);
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

  function handleWin(
    precomputed?: { readonly interest: number; readonly interestWallet: number },
  ) {
    setRound((prev) => prev + 1);
    const blindReward = blind + 2;
    const interestBefore = precomputed?.interestWallet ?? money;
    const interest = precomputed?.interest ?? calculateInterest(interestBefore);
    setMoney((prev) => prev + blindReward + interest);
    pushScoringEvent({
      kind: "money-delta",
      amount: blindReward,
      source: `${BlindValues[blind]} reward`,
    });
    if (interest > 0) {
      pushScoringEvent({
        kind: "money-delta",
        amount: interest,
        source: `Interest on $${interestBefore}`,
      });
    }
    if (blind < 3) {
      setBlind((prev) => (prev + 1) as Blind);
    } else {
      const tagPayout = totalTagPayout(pendingTags);
      if (tagPayout > 0) {
        setMoney((prev) => prev + tagPayout);
        setPendingTags([]);
      }
      const nextAnte = ante + 1;
      setAnte(nextAnte);
      setBlind(1);
      setCurrentAnteVouchers(
        pickVouchersForAnte(
          { ante: nextAnte, ownedIds: ownedVoucherIds },
          BASE_VOUCHER_SLOTS + extraVoucherSlots,
        ),
      );
      setSoldVoucherIds(new Set());
      const nextRecent = new Set(recentBossIds);
      nextRecent.add(currentBoss.id);
      setRecentBossIds(nextRecent);
      setCurrentBoss(
        pickBossForAnte({
          ante: nextAnte,
          recentIds: nextRecent,
          rng: bossPickerRngConfig.rng,
        }),
      );
      setPlayedCardKeysThisAnte(new Set());
    }
    setSoldJokerIdsThisShopVisit([]);
    setShopOffers(
      pickShopOffers({
        jokerCatalog: createJokerCatalog(),
        excludedJokerIds: jokers.map((j) => j.id),
        planetCatalog: availablePlanets(createPlanetCatalog(), handPlayCounts),
        tarotCatalog: createTarotCatalog(),
        spectralCatalog: createSpectralCatalog(),
        extraSlots: extraShopOfferSlots(ownedVoucherIds),
        extraPackSlots,
        forcedPackPools: pendingForcedPacks,
        rng: shopPickerRngConfig.rng,
      }),
    );
    setPendingForcedPacks([]);
  }

  function markOfferSold(idx: number) {
    setShopOffers((current) =>
      current
        ? current.map((o, i) => (i === idx ? { ...o, sold: true } : o))
        : current,
    );
  }

  const consumableCapacity =
    MAX_CONSUMABLE_SLOTS + extraConsumableSlots(ownedVoucherIds);

  function openPack(idx: number) {
    const offer = shopOffers?.[idx];
    if (!offer || offer.sold || offer.kind !== "pack") return;
    const price = applyShopDiscount(offer.price, ownedVoucherIds);
    if (money < price) return;
    play("pop");
    setMoney((prev) => prev - price);
    setOpenedPack(offer.pack);
    setPackPicksRemaining(packPickLimit(offer.pack.variant));
    if (offer.pack.pool === "arcana" || offer.pack.pool === "spectral") {
      const baseDeck = applySealOverrides(
        applyEnhancementOverrides(createDeck(destroyedCardKeys), cardEnhancementsByKey),
        cardSealsByKey,
      );
      const extras = applySealOverrides(
        applyEnhancementOverrides(addedCards, cardEnhancementsByKey),
        cardSealsByKey,
      );
      const preview = shuffle([...baseDeck, ...extras]).slice(0, currentHandSize);
      setPackPreviewHand(preview);
    } else {
      setPackPreviewHand([]);
    }
    setPackPreviewSelectedIds(new Set());
    markOfferSold(idx);
  }

  function decrementPackPicks() {
    setPackPicksRemaining((prev) => {
      const remaining = prev - 1;
      if (remaining <= 0) {
        setOpenedPack(null);
        setPackPreviewHand([]);
        setPackPreviewSelectedIds(new Set());
      }
      return remaining;
    });
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
        setMoney((prev) => prev + resolveHermitPayout(prev, effect.bonusCap));
      } else if (effect.kind === "joker-sell-value-payout") {
        play("pop");
        setMoney((prev) => prev + resolveTemperancePayout(jokers, effect.cap));
      } else if (effect.kind === "edition-roll") {
        play("pop");
        const result = rollWheelOfFortune(jokers, effect.chance);
        if (result.hit && result.targetIdx >= 0) {
          setJokers((prev) =>
            prev.map((j, i) => (i === result.targetIdx ? withEdition(j, result.edition) : j)),
          );
        }
      }
    } else if (option.kind === "joker") {
      if (effectiveJokerCount(jokers) >= MAX_JOKERS) return;
      play("pop");
      setJokers((prev) => [...prev, option.joker]);
    } else if (option.kind === "spectral") {
      const effect = option.spectral.effect;
      if (effect.kind === "apply-seal") {
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

  function closeOpenedPack() {
    setOpenedPack(null);
    setPackPicksRemaining(0);
    setPackPreviewHand([]);
    setPackPreviewSelectedIds(new Set());
  }

  function buyShopOffer(idx: number) {
    const offer = shopOffers?.[idx];
    if (!offer || offer.sold) return;
    if (offer.kind === "pack") {
      openPack(idx);
      return;
    }
    const price = applyShopDiscount(offer.price, ownedVoucherIds);
    if (money < price) return;
    if (offer.kind === "joker") {
      if (effectiveJokerCount(jokers) >= MAX_JOKERS) return;
      play("pop");
      setMoney((prev) => prev - price);
      setJokers((prev) => [...prev, offer.joker]);
      setSoldJokerIdsThisShopVisit((prev) => [...prev, offer.joker.id]);
      markOfferSold(idx);
      return;
    }
    if (!hasFreeConsumableSlot(consumables, consumableCapacity)) return;
    const next: Consumable =
      offer.kind === "planet"
        ? { kind: "planet", card: offer.planet }
        : offer.kind === "tarot"
          ? { kind: "tarot", card: offer.tarot }
          : { kind: "spectral", card: offer.spectral };
    play("pop");
    setMoney((prev) => prev - price);
    setConsumables((prev) => addConsumable(prev, next, consumableCapacity));
    markOfferSold(idx);
  }

  function applySpectralEffect(effect: SpectralEffect) {
    switch (effect.kind) {
      case "black-hole":
        setHandStats((prev) => {
          let next = prev;
          for (const planet of createPlanetCatalog()) {
            next = applyPlanetUpgrade(next, planet);
          }
          return next;
        });
        return;
      case "immolate": {
        const handIds = dealt.hand.map((c) => c.id);
        const shuffled = [...handIds].sort(() => Math.random() - 0.5);
        const destroyed = new Set(shuffled.slice(0, effect.destroyCount));
        setDealt((prev) => ({
          hand: prev.hand.filter((c) => !destroyed.has(c.id)),
          remaining: prev.remaining,
        }));
        setMoney((prev) => prev + effect.moneyGain);
        return;
      }
      case "sigil": {
        const suits = SUITS;
        const suit = suits[Math.floor(Math.random() * suits.length)];
        setDealt((prev) => ({
          hand: prev.hand.map((c) => ({ ...c, suit })),
          remaining: prev.remaining,
        }));
        return;
      }
      case "transmute": {
        setDealt((prev) => ({
          hand: transmuteHand(prev.hand, effect.rankFilter, effect.addCount, Math.random),
          remaining: prev.remaining,
        }));
        return;
      }
      case "apply-seal":
        return;
    }
  }

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
      play("pop");
      applySpectralEffect(spectralEffect);
      setConsumables((prev) => removeConsumableAt(prev, consumableIdx));
      return;
    }
    const effect = entry.card.effect;
    if (effect.kind === "money-multiply") {
      play("pop");
      setMoney((prev) => prev + resolveHermitPayout(prev, effect.bonusCap));
      setConsumables((prev) => removeConsumableAt(prev, consumableIdx));
      return;
    }
    if (effect.kind === "joker-sell-value-payout") {
      play("pop");
      setMoney((prev) => prev + resolveTemperancePayout(jokers, effect.cap));
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

  function sellConsumable(consumableIdx: number) {
    const entry = consumables[consumableIdx];
    if (!entry) return;
    play("pop");
    setMoney((prev) => prev + consumableSellValue(entry));
    setConsumables((prev) => removeConsumableAt(prev, consumableIdx));
  }

  function sellJoker(jokerIdx: number) {
    const entry = jokers[jokerIdx];
    if (!entry) return;
    play("pop");
    setMoney((prev) => prev + jokerSellValue(entry));
    setJokers((prev) => prev.filter((_, i) => i !== jokerIdx));
  }

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

  function rerollShopOffers(cost: number) {
    if (!shopOffers) return;
    if (money < cost) return;
    play("pop");
    setMoney((prev) => prev - cost);
    const freshItems = pickShopItemOffers({
      jokerCatalog: createJokerCatalog(),
      excludedJokerIds: [
        ...jokers.map((j) => j.id),
        ...soldJokerIdsThisShopVisit,
      ],
      planetCatalog: availablePlanets(createPlanetCatalog(), handPlayCounts),
      tarotCatalog: createTarotCatalog(),
      spectralCatalog: createSpectralCatalog(),
      extraSlots: extraShopOfferSlots(ownedVoucherIds),
      rng: shopPickerRngConfig.rng,
    });
    setShopOffers((current) => {
      if (!current) return current;
      const existingPacks = current.filter((o) => o.kind === "pack");
      return [...freshItems, ...existingPacks];
    });
  }

  function closeShopAndStartNextRound() {
    setShopOffers(null);
    setSoldJokerIdsThisShopVisit([]);
    setPendingBlindSelect(true);
  }

  function confirmBlindSelect() {
    setPendingBlindSelect(false);
    startNewRound();
  }

  function skipBlind() {
    if (blind === 3) return;
    setBlind((prev) => (prev + 1) as Blind);
    setRound((prev) => prev + 1);
    setPendingTags((prev) => [...prev, "investment"]);
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

  function buyAnteVoucher(voucherIdx: number) {
    const voucher = currentAnteVouchers[voucherIdx];
    if (!voucher) return;
    if (soldVoucherIds.has(voucher.id)) return;
    if (money < voucher.cost) return;
    if (voucher.requires && !ownedVoucherIds.has(voucher.requires)) return;
    play("pop");
    setMoney((prev) => prev - voucher.cost);
    setOwnedVoucherIds((prev) => {
      const next = new Set(prev);
      next.add(voucher.id);
      return next;
    });
    setSoldVoucherIds((prev) => {
      const next = new Set(prev);
      next.add(voucher.id);
      return next;
    });
    if (voucher.id === "overstock" || voucher.id === "overstock-plus") {
      setShopOffers((current) => {
        if (!current) return current;
        const extra = pickSingleShopOffer(
          {
            jokerCatalog: createJokerCatalog(),
            excludedJokerIds: [
              ...jokers.map((j) => j.id),
              ...soldJokerIdsThisShopVisit,
            ],
            planetCatalog: availablePlanets(
              createPlanetCatalog(),
              handPlayCounts,
            ),
            tarotCatalog: createTarotCatalog(),
            spectralCatalog: createSpectralCatalog(),
            rng: shopPickerRngConfig.rng,
          },
          current,
        );
        return extra ? [...current, extra] : current;
      });
    }
  }

  function reorderJokers(orderedIds: ReadonlyArray<string>) {
    setJokers((prev) => {
      const byId = new Map(prev.map((j) => [j.id, j]));
      const ordered = orderedIds.flatMap((id) => byId.get(id) ?? []);
      const seen = new Set(orderedIds);
      return [...ordered, ...prev.filter((j) => !seen.has(j.id))];
    });
  }

  function startNewGame(): void {
    setBlind(1);
    setRound(1);
    setAnte(1);
    setMoney(4);
    setHandSizeModifier(0);
    setExtraPackSlots(0);
    setPendingForcedPacks([]);
    setExtraVoucherSlots(0);
    setDevChipsBonus(0);
    setDevMultBonus(0);
    setDevMultFactor(1);
    setForceProbabilities(false);
    setJokers(initialJokersConfig.factory());
    setHandPlayCounts(emptyHandCounts());
    setHandStats(createDefaultHandStats());
    setDestroyedCardKeys(new Set());
    setAddedCards([]);
    setCardEnhancementsByKey(new Map());
    setConsumables([]);
    const freshOwned = new Set<VoucherId>();
    setOwnedVoucherIds(freshOwned);
    setCurrentAnteVouchers(
      pickVouchersForAnte({ ante: 1, ownedIds: freshOwned }, BASE_VOUCHER_SLOTS),
    );
    setSoldVoucherIds(new Set());
    setRecentBossIds(new Set());
    const freshBoss = pickBossForAnte({
      ante: 1,
      rng: bossPickerRngConfig.rng,
    });
    setCurrentBoss(freshBoss);
    setPendingTags([]);
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
      setDealt({ hand: [...kept, ...drawn], remaining: newRemaining });
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
      setMoney((prev) => Math.max(0, prev - moneyPenalty));
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
          setMoney((prev) => prev + remainingHandsBonus);
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
          interest: calculateInterest(postGoldWallet),
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
        onHighVisibilityChange={setHighVisibility}
        onAnimationSpeedChange={setAnimationSpeedState}
      />
      <Game
        onWin={handleWin}
        onAddChips={addChips}
        onAddMultiplier={addMultiplier}
        onMultiplyMultiplier={multiplyMultiplier}
        onSetMoney={setMoney}
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
          skipReward="investment"
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
