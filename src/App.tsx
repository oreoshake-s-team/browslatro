import { Suspense, lazy, useEffect, useRef } from "react";

const BlindSelectScreenLazy = lazy(
  () => import("./components/game/BlindSelectScreen"),
);
import "./App.css";
import { useGame } from "./store/game";
import { BASE_VOUCHER_SLOTS } from "./store/vouchers";
import { BASE_CHIPS, BLIND_MULTIPLIERS } from "./constants";
import {
  availableBosses,
  createBossCatalog,
  pickBossForAnte,
} from "./items/bosses";
import { chanceOverrideConfig } from "./dev/chanceOverride";
import Game from "./components/game/Game";
const RoundWonModal = lazy(() => import("./components/game/RoundWonModal"));
import NewRunScreen from "./components/game/NewRunScreen";
import { STARTING_MONEY } from "./store/economy";
import { deckStartingMoneyDelta } from "./items/decks";
import {
  pruneTagsByCategory,
  rollAnteSkipOffers,
  tagOfferRngConfig,
} from "./items/tags";
import { applyNextShopModifiers } from "./run/nextShopMods";
import {
  MAX_CONSUMABLE_SLOTS,
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
import { initialDeal } from "./cards/deckBuild";
import { createDeck, resetCardIds } from "./cards/deck";
import { usePlayHand } from "./hooks/usePlayHand";
import { useDiscardPipeline } from "./hooks/useDiscardPipeline";
import { useOpenedPackPicker } from "./hooks/useOpenedPackPicker";
import { useTagDispatcher } from "./hooks/useTagDispatcher";
import { useRoundLifecycle } from "./hooks/useRoundLifecycle";
import {
  MAX_JOKERS,
  effectiveJokerCount,
  initialJokersConfig,
} from "./items/jokers";
import {
  applyShopDiscount,
  extraConsumableSlots,
  pickVouchersForAnte,
  VOUCHER_CATALOG,
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
  const round = useGame((state) => state.round);
  const ante = useGame((state) => state.ante);
  const money = useGame((state) => state.money);
  const chips = useGame((state) => state.chips);
  const multiplier = useGame((state) => state.multiplier);
  // Dev "Apply modifiers" offsets. Sticky across selection/scoring/finalize
  // so the displayed chips/multiplier reflect manual bumps until a New game
  // resets them. See #265.
  const devChipsBonus = useGame((state) => state.devChipsBonus);
  const devMultBonus = useGame((state) => state.devMultBonus);
  const devMultFactor = useGame((state) => state.devMultFactor);
  const forceProbabilities = useGame((state) => state.forceProbabilities);
  useEffect(() => {
    chanceOverrideConfig.force100 = forceProbabilities;
    return () => {
      chanceOverrideConfig.force100 = false;
    };
  }, [forceProbabilities]);
  const roundScore = useGame((state) => state.roundScore);
  const selectedHand = useGame((state) => state.selectedHand);
  const remainingHands = useGame((state) => state.remainingHands);
  const remainingDiscards = useGame((state) => state.remainingDiscards);
  const runStats = useGame((state) => state.runStats);
  const setDealt = useGame((state) => state.setDealt);
  const setBaseDeckCards = useGame((state) => state.setBaseDeckCards);
  useEffect(() => {
    resetCardIds();
    const fresh = createDeck();
    setBaseDeckCards(fresh);
    const s = useGame.getState();
    setDealt(
      initialDeal(
        fresh,
        s.destroyedCardIds,
        undefined,
        s.addedCards,
        s.cardEnhancementsById,
        s.cardSealsById,
      ),
    );
  }, [setDealt, setBaseDeckCards]);
  const highVisibility = usePreferences((state) => state.highVisibility);
  const animationSpeed = usePreferences((state) => state.animationSpeed);
  const selectedIds = useGame((state) => state.selectedIds);
  const discardingIds = useGame((state) => state.discardingIds);
  const jokers = useGame((state) => state.jokers);
  const setJokers = useGame((state) => state.setJokers);
  useEffect(() => {
    setJokers(initialJokersConfig.factory());
  }, [setJokers]);
  const handPlayCounts = useGame((state) => state.handPlayCounts);
  const handStats = useGame((state) => state.handStats);
  const {
    pendingDiscardCountRef,
    pendingHandPlayResetRef,
    skipDrawAfterDiscardRef,
    handleCardDiscardEnd,
    discardSelected,
    resetForNewRound: resetDiscardPipeline,
  } = useDiscardPipeline();
  const scoringEvents = useGame((state) => state.scoringEvents);

  const { pickFromOpenedPack } = useOpenedPackPicker();
  const { applyGainedTag } = useTagDispatcher();

  const scoringStepMs = getScoringStepMs(animationSpeed);
  const loseGameRef = useRef<() => void>(() => {});
  const {
    submitHand,
    isScoring,
    currentScoringId,
    currentGoldScoringId,
    currentSteelScoringId,
    resetScoring,
  } = usePlayHand({
    stepMs: scoringStepMs,
    loseGame: () => loseGameRef.current(),
    pendingDiscardCountRef,
    pendingHandPlayResetRef,
    skipDrawAfterDiscardRef,
  });
  const { startNewRound, startNewGame, loseGame, skipBlind } = useRoundLifecycle({
    applyGainedTag,
    resetScoring,
    resetDiscardPipeline,
  });
  loseGameRef.current = loseGame;

  // Round-won modal: when non-null, the player has met the required score and
  // the modal is showing. Dismissal triggers handleWin().
  const pendingWin = useGame((state) => state.pendingWin);
  const setPendingWin = useGame((state) => state.setPendingWin);

  const shopOffers = useGame((state) => state.shopOffers);
  const setShopOffers = useGame((state) => state.setShopOffers);
  const setSoldJokerIdsThisShopVisit = useGame(
    (state) => state.setSoldJokerIdsThisShopVisit,
  );
  const consumables = useGame((state) => state.consumables);
  const openedPack = useGame((state) => state.openedPack);
  const packPicksRemaining = useGame((state) => state.packPicksRemaining);
  const packPreviewHand = useGame((state) => state.packPreviewHand);
  const packPreviewSelectedIds = useGame(
    (state) => state.packPreviewSelectedIds,
  );
  const pickedPackOptionIndices = useGame(
    (state) => state.pickedPackOptionIndices,
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
  const pendingRunSelect = useGame((state) => state.pendingRunSelect);
  const setPendingRunSelect = useGame((state) => state.setPendingRunSelect);
  const selectedStake = useGame((state) => state.selectedStake);
  const setSelectedStake = useGame((state) => state.setSelectedStake);
  const selectedDeck = useGame((state) => state.selectedDeck);
  const setSelectedDeck = useGame((state) => state.setSelectedDeck);
  const setMoney = useGame((state) => state.setMoney);
  const pendingTags = useGame((state) => state.pendingTags);
  const setPendingTags = useGame((state) => state.setPendingTags);
  const ownedVoucherIds = useGame((state) => state.ownedVoucherIds);
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
  const bossScoreMultiplier = currentBoss.scoreMultiplier;
  const requiredScore =
    blind === 3
      ? BASE_CHIPS[ante - 1] * bossScoreMultiplier
      : BASE_CHIPS[ante - 1] * BLIND_MULTIPLIERS[blind - 1];

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
    setPendingTags((prev) => pruneTagsByCategory(prev, "next-shop"));
    setPendingBlindSelect(true);
  }

  function confirmBlindSelect() {
    setPendingBlindSelect(false);
    startNewRound();
  }

  const buyAnteVoucherAction = useGame((s) => s.buyAnteVoucher);
  const buyAnteVoucher = (voucherIdx: number) => {
    const voucher = currentAnteVouchers[voucherIdx];
    if (!voucher) return;
    if (soldVoucherIds.has(voucher.id)) return;
    const price = applyShopDiscount(voucher.cost, ownedVoucherIds);
    if (money < price) return;
    if (voucher.requires && !ownedVoucherIds.has(voucher.requires)) return;
    play("pop");
    buyAnteVoucherAction(voucherIdx);
  };

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
                pickedIndices: pickedPackOptionIndices,
                onSelectPreviewCard: togglePackPreviewCard,
                onPick: pickFromOpenedPack,
                onClose: closeOpenedPack,
              }
            : undefined
        }
        onCardDiscardEnd={handleCardDiscardEnd}
      />
      {pendingWin && (
        <Suspense fallback={null}>
          <RoundWonModal info={pendingWin} onContinue={dismissRoundWonModal} />
        </Suspense>
      )}
      {pendingRunSelect && (
        <NewRunScreen
          initialStake={selectedStake}
          initialDeck={selectedDeck}
          onConfirm={({ stake, deck }) => {
            setSelectedStake(stake);
            setSelectedDeck(deck);
            setMoney(STARTING_MONEY + deckStartingMoneyDelta(deck));
            setPendingRunSelect(false);
          }}
        />
      )}
      {pendingBlindSelect && !pendingRunSelect && (
        <Suspense fallback={null}>
          <BlindSelectScreenLazy
            ante={ante}
            currentBlind={blind}
            boss={currentBoss}
            stake={selectedStake}
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
        </Suspense>
      )}
    </div>
  );
}

export default App;
