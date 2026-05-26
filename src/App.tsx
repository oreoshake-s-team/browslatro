import { useEffect, useRef, useState } from "react";
import "./App.css";
import type { Blind, Card, Hand } from "./cards/types";
import { BASE_CHIPS, BLIND_MULTIPLIERS } from "./constants";
import Game from "./components/game/Game";
import RoundWonModal, { type RoundWonInfo } from "./components/game/RoundWonModal";
import Shop from "./components/shop/Shop";
import { applyPlanetUpgrade, availablePlanets, createPlanetCatalog } from "./items/planets";
import { createSpectralCatalog, type SpectralEffect } from "./items/spectrals";
import { createTarotCatalog, resolveHermitPayout } from "./items/tarots";
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
  getScoringCards,
  getScoringStep,
} from "./scoring/scoring";
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
import { STEEL_MULT_FACTOR, steelHeldMultiplier } from "./cards/heldInHand";
import {
  applyCardEnhancement,
  applyLuckyRolls,
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
  computeFinalScoreWithJokers,
  createJokerCatalog,
  initialJokersConfig,
  isFaceCard,
  jokerSellValue,
  type Joker,
  type JokerHandLevelStep,
} from "./items/jokers";
import {
  pickShopOffers,
  rerollShopOffer,
  shopPickerRngConfig,
  type ShopItem,
} from "./items/shop";
import {
  applyShopDiscount,
  extraConsumableSlots,
  extraShopOfferSlots,
  pickVoucherForAnte,
  VOUCHER_CATALOG,
  type Voucher,
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

function initialDeal(
  excludedKeys: ReadonlySet<string> = new Set(),
): DealResult {
  return deal(shuffle(createDeck(excludedKeys)), HAND_SIZE);
}

function App() {
  const [blind, setBlind] = useState<Blind>(1);
  const [round, setRound] = useState(1);
  const [ante, setAnte] = useState(1);
  const [money, setMoney] = useState(4);
  const [chips, setChips] = useState(0);
  const [multiplier, setMultiplier] = useState(0);
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
  const [consumables, setConsumables] = useState<ReadonlyArray<Consumable>>([]);
  const [draggingConsumableIndex, setDraggingConsumableIndex] = useState<
    number | null
  >(null);
  const [draggingJokerIndex, setDraggingJokerIndex] = useState<number | null>(
    null,
  );
  const [ownedVoucherIds, setOwnedVoucherIds] = useState<ReadonlySet<VoucherId>>(
    () => new Set(),
  );
  const [currentAnteVoucher, setCurrentAnteVoucher] = useState<Voucher | null>(
    () => pickVoucherForAnte({ ante: 1, ownedIds: new Set() }),
  );
  const [currentAnteVoucherSold, setCurrentAnteVoucherSold] = useState(false);

  const requiredScore = BASE_CHIPS[ante - 1] * BLIND_MULTIPLIERS[blind - 1];

  function startNewRound() {
    setRoundScore(0);
    setRemainingHands(4);
    setRemainingDiscards(3);
    setDealt(initialDeal(destroyedCardKeys));
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
    setHandLevelSteps([]);
    setHandLevelIndex(0);
    handLevelFinalizeRef.current = null;
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
      play("pop");
      const enhancementEffect = applyCardEnhancement(stepCard);
      if (enhancementEffect.multDelta > 0) {
        setMultiplier((prev) => prev + enhancementEffect.multDelta);
      }
      if (enhancementEffect.multTimes !== 1) {
        setMultiplier((prev) => prev * enhancementEffect.multTimes);
      }
      if (rollEnhancementChance(enhancementEffect.destroyChance)) {
        const key = cardKey(stepCard);
        setDestroyedCardKeys((prev) => {
          if (prev.has(key)) return prev;
          const next = new Set(prev);
          next.add(key);
          return next;
        });
      }
      const luckyResult = applyLuckyRolls(stepCard);
      if (luckyResult.multBonus > 0) {
        setMultiplier((prev) => prev + luckyResult.multBonus);
      }
      if (luckyResult.moneyBonus > 0) {
        setMoney((prev) => prev + luckyResult.moneyBonus);
      }
      const sealMoney = goldSealMoney(stepCard);
      if (sealMoney > 0) {
        setMoney((prev) => prev + sealMoney);
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
      play("gold");
      setGoldScoringIndex((prev) => prev + 1);
    }, stepMs);
    return () => window.clearTimeout(timer);
  }, [goldScoringIds, goldScoringIndex, animationSpeed]);

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
      play("pop");
      setSteelScoringIndex((prev) => prev + 1);
    }, stepMs);
    return () => window.clearTimeout(timer);
  }, [steelScoringIds, steelScoringIndex, animationSpeed]);

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
      }
      if (step.additiveMult) {
        setMultiplier((prev) => prev + (step.additiveMult ?? 0));
      }
      if (step.xMultFactor !== undefined && step.xMultFactor !== 1) {
        setMultiplier((prev) => prev * (step.xMultFactor ?? 1));
      }
      play("pop");
      pulseJokers([step.jokerId]);
      setHandLevelIndex((prev) => prev + 1);
    }, stepMs);
    return () => window.clearTimeout(timer);
  }, [handLevelSteps, handLevelIndex, animationSpeed]);

  function handleWin() {
    setRound((prev) => prev + 1);
    setMoney((prev) => prev + (blind + 2) + calculateInterest(prev));
    if (blind < 3) {
      setBlind((prev) => (prev + 1) as Blind);
    } else {
      const nextAnte = ante + 1;
      setAnte(nextAnte);
      setBlind(1);
      setCurrentAnteVoucher(
        pickVoucherForAnte({ ante: nextAnte, ownedIds: ownedVoucherIds }),
      );
      setCurrentAnteVoucherSold(false);
    }
    setShopOffers(
      pickShopOffers({
        jokerCatalog: createJokerCatalog(),
        excludedJokerIds: jokers.map((j) => j.id),
        planetCatalog: availablePlanets(createPlanetCatalog(), handPlayCounts),
        tarotCatalog: createTarotCatalog(),
        spectralCatalog: createSpectralCatalog(),
        extraSlots: extraShopOfferSlots(ownedVoucherIds),
        rng: shopPickerRngConfig.rng,
      }),
    );
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

  function buyShopOffer(idx: number) {
    const offer = shopOffers?.[idx];
    if (!offer || offer.sold) return;
    const price = applyShopDiscount(offer.price, ownedVoucherIds);
    if (money < price) return;
    if (offer.kind === "joker") {
      if (jokers.length >= MAX_JOKERS) return;
      play("pop");
      setMoney((prev) => prev - price);
      setJokers((prev) => [...prev, offer.joker]);
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
      case "apply-seal":
        return;
    }
  }

  function useConsumable(consumableIdx: number) {
    const entry = consumables[consumableIdx];
    if (!entry) return;
    if (entry.kind === "planet") {
      play("pop");
      setHandStats((prev) => applyPlanetUpgrade(prev, entry.card));
      setConsumables((prev) => removeConsumableAt(prev, consumableIdx));
      return;
    }
    if (entry.kind === "spectral") {
      const spectralEffect = entry.card.effect;
      if (spectralEffect.kind === "apply-seal") {
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
    const soldJokerIds = shopOffers
      .filter((o) => o.kind === "joker" && o.sold)
      .map((o) => (o.kind === "joker" ? o.joker.id : ""));
    const excludedJokerIds = [...jokers.map((j) => j.id), ...soldJokerIds];
    const args = {
      jokerCatalog: createJokerCatalog(),
      excludedJokerIds,
      planetCatalog: availablePlanets(createPlanetCatalog(), handPlayCounts),
      tarotCatalog: createTarotCatalog(),
      spectralCatalog: createSpectralCatalog(),
      rng: shopPickerRngConfig.rng,
    };
    play("pop");
    setMoney((prev) => prev - cost);
    setShopOffers((current) => {
      if (!current) return current;
      return current.map((offer) => {
        if (offer.sold) return offer;
        const replacement = rerollShopOffer(offer, args);
        return replacement ?? offer;
      });
    });
  }

  function closeShopAndStartNextRound() {
    setShopOffers(null);
    startNewRound();
  }

  function buyCurrentAnteVoucher() {
    const voucher = currentAnteVoucher;
    if (!voucher) return;
    if (currentAnteVoucherSold) return;
    if (money < voucher.cost) return;
    if (voucher.requires && !ownedVoucherIds.has(voucher.requires)) return;
    play("pop");
    setMoney((prev) => prev - voucher.cost);
    setOwnedVoucherIds((prev) => {
      const next = new Set(prev);
      next.add(voucher.id);
      return next;
    });
    setCurrentAnteVoucherSold(true);
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
    setJokers(initialJokersConfig.factory());
    setHandPlayCounts(emptyHandCounts());
    setHandStats(createDefaultHandStats());
    setDestroyedCardKeys(new Set());
    setConsumables([]);
    const freshOwned = new Set<VoucherId>();
    setOwnedVoucherIds(freshOwned);
    setCurrentAnteVoucher(pickVoucherForAnte({ ante: 1, ownedIds: freshOwned }));
    setCurrentAnteVoucherSold(false);
    startNewRound();
  }

  function addChips(amount: number) {
    play("pop");
    setChips((prev) => prev + amount);
  }

  function addMultiplier(amount: number) {
    play("pop");
    setMultiplier((prev) => prev + amount);
  }

  function multiplyMultiplier(factor: number) {
    play("pop");
    setMultiplier((prev) => prev * factor);
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
    const entry = handStats[label];
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
      const drawCount = drawCountForRefill(
        HAND_SIZE,
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

    pendingHandPlayResetRef.current = true;

    const label = detectHandLabel(playedCards);
    setHandPlayCounts((prev) => ({ ...prev, [label]: prev[label] + 1 }));
    const handEntry = handStats[label];
    const scoring = expandRedSealRetriggers(getScoringCards(playedCards, label));
    const cardChipsTotal = scoring.reduce(
      (sum, card) => sum + getCardChips(card),
      0,
    );
    const handJokerResult = applyHandLevelJokers(jokers, {
      playedHandLabel: label,
      playedCardCount: playedCards.length,
      scoredCards: scoring,
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

    const finalScore = computeFinalScoreWithJokers(
      handEntry.chips,
      handEntry.multiplier,
      cardChipsTotal,
      {
        additiveMult: handJokerResult.additiveMult + perCardAdditiveMult,
        additiveChips: handJokerResult.additiveChips + perCardAdditiveChips,
        xMult: totalXMult,
        moneyEarned: 0,
      },
    );

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
        }
        setPendingWin({
          roundScore: newRoundScore,
          requiredScore,
          baseReward: blind + 2,
          walletAtPayout: postBonusesWallet,
          interest: calculateInterest(postBonusesWallet),
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
    setPendingWin(null);
    handleWin();
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
        chips={chips}
        multiplier={multiplier}
        roundScore={roundScore}
        requiredScore={requiredScore}
        selectedHand={selectedHand}
        remainingHands={remainingHands}
        remainingDiscards={remainingDiscards}
        handPlayCounts={handPlayCounts}
        handStats={handStats}
        ownedVouchers={VOUCHER_CATALOG.filter((v) => ownedVoucherIds.has(v.id))}
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
        canDiscard={
          selectedIds.size > 0 &&
          remainingDiscards > 0 &&
          discardingIds.size === 0 &&
          !isScoring
        }
        isScoring={isScoring}
        scoringId={currentScoringId}
        goldScoringId={currentGoldScoringId}
        steelScoringId={currentSteelScoringId}
        handPlaySignal={handPlaySignal}
        hand={dealt.hand}
        remaining={dealt.remaining}
        selectedIds={selectedIds}
        discardingIds={discardingIds}
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
        onToggleCard={toggleCard}
        onCardDiscardEnd={handleCardDiscardEnd}
        onDisplayOrderChange={setHandDisplayOrder}
        onReorderJokers={reorderJokers}
      />
      {pendingWin && (
        <RoundWonModal info={pendingWin} onContinue={dismissRoundWonModal} />
      )}
      {shopOffers && (
        <Shop
          money={money}
          equippedJokerCount={jokers.length}
          consumableCount={consumables.length}
          consumableCapacity={consumableCapacity}
          offers={shopOffers}
          voucher={currentAnteVoucher}
          voucherSold={currentAnteVoucherSold}
          ownedVoucherIds={ownedVoucherIds}
          onBuy={buyShopOffer}
          onBuyVoucher={buyCurrentAnteVoucher}
          onReroll={rerollShopOffers}
          onNext={closeShopAndStartNextRound}
        />
      )}
    </div>
  );
}

export default App;
