import { useEffect, useState } from "react";
import "./App.css";
import { useGame } from "./store/game";
import { BASE_VOUCHER_SLOTS } from "./store/vouchers";
import type { Blind, Card, Hand } from "./cards/types";
import { BASE_CHIPS, BLIND_MULTIPLIERS } from "./constants";
import {
  DEFAULT_STARTING_DISCARDS,
  DEFAULT_STARTING_HANDS,
  applyBossFaceDown,
  bossAdjustHandEntry,
  bossBlocksHandLabel,
  availableBosses,
  bossHandSize,
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
import BlindSelectScreen from "./components/game/BlindSelectScreen";
import NopeAnimation from "./components/game/NopeAnimation";
import {
  resolveTagEffect,
  rollAnteSkipOffers,
  tagOfferRngConfig,
} from "./items/tags";
import { applyNextShopModifiers } from "./run/nextShopMods";
import { initialRunStats, recordBlindSkipped } from "./run/runStats";
import {
  MAX_CONSUMABLE_SLOTS,
  consumableUseBlock,
  hasFreeConsumableSlot,
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
import { HAND_SIZE } from "./cards/deck";
import { initialDeal } from "./cards/deckBuild";
import { usePlayHand } from "./hooks/usePlayHand";
import { useDiscardPipeline } from "./hooks/useDiscardPipeline";
import { useConsumableActions } from "./hooks/useConsumableActions";
import { useOpenedPackPicker } from "./hooks/useOpenedPackPicker";
import { useTagDispatcher } from "./hooks/useTagDispatcher";
import { MAX_SELECTED } from "./components/cards/Hand";
import {
  MAX_JOKERS,
  effectiveJokerCount,
  initialJokersConfig,
} from "./items/jokers";
import { SHOP_PACK_SLOTS } from "./items/shop";
import {
  extraConsumableSlots,
  extraHandSize,
  extraStartingDiscards,
  extraStartingHands,
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
  const setHandDisplayOrder = useGame((state) => state.setHandDisplayOrder);
  const jokers = useGame((state) => state.jokers);
  const setJokers = useGame((state) => state.setJokers);
  const jokerPulseCounters = useGame((state) => state.jokerPulseCounters);
  useEffect(() => {
    setJokers(initialJokersConfig.factory());
  }, [setJokers]);
  const handPlayCounts = useGame((state) => state.handPlayCounts);
  const handStats = useGame((state) => state.handStats);
  const handPlaySignal = useGame((state) => state.handPlaySignal);
  const {
    pendingDiscardCountRef,
    pendingHandPlayResetRef,
    skipDrawAfterDiscardRef,
    handleCardDiscardEnd,
    discardSelected,
    resetForNewRound: resetDiscardPipeline,
  } = useDiscardPipeline();
  const destroyedCardKeys = useGame((state) => state.destroyedCardKeys);
  const setDestroyedCardKeys = useGame((state) => state.setDestroyedCardKeys);
  const scoringEvents = useGame((state) => state.scoringEvents);
  const setScoringEvents = useGame((state) => state.setScoringEvents);
  const addedCards = useGame((state) => state.addedCards);
  const setAddedCards = useGame((state) => state.setAddedCards);
  const cardEnhancementsByKey = useGame((state) => state.cardEnhancementsByKey);
  const setCardEnhancementsByKey = useGame(
    (state) => state.setCardEnhancementsByKey,
  );
  const cardSealsByKey = useGame((state) => state.cardSealsByKey);

  // Sequential scoring state — read for render; mutations live in usePlayHand.
  const scoringIndex = useGame((state) => state.scoringIndex);

  const luckyMultProcIds = useGame((state) => state.luckyMultProcIds);
  const setLuckyMultProcIds = useGame((state) => state.setLuckyMultProcIds);
  const luckyMoneyProcIds = useGame((state) => state.luckyMoneyProcIds);
  const setLuckyMoneyProcIds = useGame((state) => state.setLuckyMoneyProcIds);

  const [nopeTriggerKey, setNopeTriggerKey] = useState(0);
  function triggerNopeAnimation() {
    setNopeTriggerKey((prev) => prev + 1);
  }

  const [pendingNextRoundHandSize, setPendingNextRoundHandSize] = useState(0);

  const { useConsumable } = useConsumableActions({ triggerNopeAnimation });
  const { pickFromOpenedPack } = useOpenedPackPicker({ triggerNopeAnimation });
  const { applyGainedTag } = useTagDispatcher({
    setPendingNextRoundHandSize,
  });

  const scoringStepMs = getScoringStepMs(animationSpeed);
  const {
    submitHand,
    isScoring,
    currentScoringId,
    currentGoldScoringId,
    currentSteelScoringId,
    resetScoring,
  } = usePlayHand({
    stepMs: scoringStepMs,
    loseGame,
    pendingDiscardCountRef,
    pendingHandPlayResetRef,
    skipDrawAfterDiscardRef,
  });

  // Round-won modal: when non-null, the player has met the required score and
  // the modal is showing. Dismissal triggers handleWin().
  const pendingWin = useGame((state) => state.pendingWin);
  const setPendingWin = useGame((state) => state.setPendingWin);

  const shopOffers = useGame((state) => state.shopOffers);
  const setShopOffers = useGame((state) => state.setShopOffers);
  const setSoldJokerIdsThisShopVisit = useGame(
    (state) => state.setSoldJokerIdsThisShopVisit,
  );
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
    resetDiscardPipeline();
    resetScoring();
    setLuckyMultProcIds(new Set());
    setLuckyMoneyProcIds(new Set());
    setScoringEvents([]);
    setPendingWin(null);
  }

  const handleWin = useGame((s) => s.handleWin);

  const consumableCapacity =
    MAX_CONSUMABLE_SLOTS + extraConsumableSlots(ownedVoucherIds);


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

  function dismissRoundWonModal() {
    const precomputed = pendingWin
      ? { interest: pendingWin.interest, interestWallet: pendingWin.interestWallet }
      : undefined;
    setPendingWin(null);
    handleWin(precomputed);
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
