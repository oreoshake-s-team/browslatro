import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAutopilot } from "./hooks/useAutopilot";
import { useMoveExplanation } from "./ai/advisor/useMoveExplanation";
import { captureAdviceFeedback } from "./ai/humanPlayWiring";
import { buildHandPolicyFeedbackEvent } from "./ai/advisor/adviceFeedback";
import { recordShopFeedback } from "./ai/advisor/shownShopAdvice";
import {
  clearHandAdvice,
  recordHandFeedback,
  rememberHandAdvice,
} from "./ai/advisor/shownHandAdvice";

const BlindSelectScreenLazy = lazy(
  () => import("./components/game/BlindSelectScreen"),
);
const JokerGrantAcknowledge = lazy(
  () => import("./components/jokers/JokerGrantAcknowledge"),
);
import "./App.css";
import { useGame } from "./store/game";
import { BASE_VOUCHER_SLOTS } from "./store/vouchers";
import { requiredChipsForBlind } from "./scoring/anteScaling";
import {
  availableBosses,
  createBossCatalog,
  pickBossForAnte,
} from "./items/bosses";
import { chanceOverrideConfig } from "./dev/chanceOverride";
import { bootIntoShop, shouldBootIntoShop } from "./dev/bootShop";
import { devToolsEnabled } from "./dev/devTools";
import { readSeededConsumables } from "./dev/seedConsumables";
import Game from "./components/game/Game";
import LazyChunkErrorBoundary from "./components/system/LazyChunkErrorBoundary";
import LazyChunkSpinner from "./components/system/LazyChunkSpinner";
import { didRestoreFromSnapshot } from "./save/restore";
const RoundWonModal = lazy(() => import("./components/game/RoundWonModal"));
const RoundLostModal = lazy(() => import("./components/game/RoundLostModal"));
const GameWonScreen = lazy(() => import("./components/game/GameWonScreen"));
import NewRunScreen from "./components/game/NewRunScreen";
import { useShopController } from "./hooks/useShopController";
import { usePackOpenController } from "./hooks/usePackOpenController";
import { deckJokerSlotsDelta } from "./items/decks";
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
import LiveAnnouncer from "./components/system/LiveAnnouncer";
import AdminModeController from "./components/system/AdminModeController";
import BossEffectToast from "./components/system/BossEffectToast";
import {
  getAnimationSpeed,
  getAnimationSpeedMultiplier,
  hasUserOverriddenAnimationSpeed,
  usePreferences,
  type AnimationSpeed,
} from "./components/system/preferences";
import { initialDeal } from "./cards/deckBuild";
import { createDeck, resetCardIds } from "./cards/deck";
import { useAdviceFeedbackNotice } from "./hooks/useAdviceFeedbackNotice";
import { usePlayHand } from "./hooks/usePlayHand";
import { useDiscardPipeline } from "./hooks/useDiscardPipeline";
import { useOpenedPackPicker } from "./hooks/useOpenedPackPicker";
import { useTagDispatcher } from "./hooks/useTagDispatcher";
import { useRoundLifecycle } from "./hooks/useRoundLifecycle";
import {
  MAX_JOKERS,
  effectiveJokerCount,
  hasChaosTheClownInJokers,
  initialJokersConfig,
  probabilityMultiplierFromJokers,
  shopExitConsumableCopies,
} from "./items/jokers";
import {
  applyShopDiscount,
  BOSS_REROLL_COST,
  bossRerollsRemaining,
  extraConsumableSlots,
  extraJokerSlots,
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
  const { t } = useTranslation();
  const blind = useGame((state) => state.blind);
  const round = useGame((state) => state.round);
  const ante = useGame((state) => state.ante);
  const money = useGame((state) => state.money);
  const chips = useGame((state) => state.chips);
  const multiplier = useGame((state) => state.multiplier);
  // Dev "Apply modifiers" offsets. Sticky across selection/scoring/finalize
  // so the displayed chips/multiplier reflect manual bumps until a New game
  // resets them.
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
    if (didRestoreFromSnapshot()) return;
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
        s.cardEditionsById,
      ),
    );
  }, [setDealt, setBaseDeckCards]);
  const highVisibility = usePreferences((state) => state.highVisibility);
  useEffect(() => {
    document.body.classList.toggle("high-visibility", highVisibility);
    return () => {
      document.body.classList.remove("high-visibility");
    };
  }, [highVisibility]);
  const dyslexicFont = usePreferences((state) => state.dyslexicFont);
  useEffect(() => {
    document.body.classList.toggle("dyslexic-font", dyslexicFont);
    return () => {
      document.body.classList.remove("dyslexic-font");
    };
  }, [dyslexicFont]);
  const animationSpeed = usePreferences((state) => state.animationSpeed);
  const selectedIds = useGame((state) => state.selectedIds);
  const discardingIds = useGame((state) => state.discardingIds);
  const jokers = useGame((state) => state.jokers);
  const setJokers = useGame((state) => state.setJokers);
  useEffect(() => {
    if (didRestoreFromSnapshot()) return;
    setJokers(initialJokersConfig.factory());
  }, [setJokers]);
  useEffect(() => {
    chanceOverrideConfig.probabilityMultiplier =
      probabilityMultiplierFromJokers(jokers);
    return () => {
      chanceOverrideConfig.probabilityMultiplier = 1;
    };
  }, [jokers]);
  const handPlayCounts = useGame((state) => state.handPlayCounts);
  const handStats = useGame((state) => state.handStats);
  const {
    pendingDiscardCountRef,
    pendingHandPlayResetRef,
    skipDrawAfterDiscardRef,
    handleCardDiscardEnd,
    discardSelected: discardSelectedRaw,
    resetForNewRound: resetDiscardPipeline,
  } = useDiscardPipeline();
  const scoringEvents = useGame((state) => state.scoringEvents);

  const { pickFromOpenedPack } = useOpenedPackPicker();
  const { applyGainedTag } = useTagDispatcher();

  const scoringStepMs = getScoringStepMs(animationSpeed);
  const loseGameRef = useRef<
    (info: { roundScore: number; requiredScore: number }) => void
  >(() => {});
  const {
    submitHand: submitHandRaw,
    isScoring,
    currentScoringId,
    currentGoldScoringId,
    currentSteelScoringId,
    resetScoring,
  } = usePlayHand({
    stepMs: scoringStepMs,
    loseGame: (info) => loseGameRef.current(info),
    pendingDiscardCountRef,
    pendingHandPlayResetRef,
    skipDrawAfterDiscardRef,
  });
  const submitHand = () => {
    recordHandFeedback(
      { action: "play", cardIds: [...useGame.getState().selectedIds] },
      useGame.getState(),
    );
    submitHandRaw();
  };
  const discardSelected = () => {
    recordHandFeedback(
      { action: "discard", cardIds: [...useGame.getState().selectedIds] },
      useGame.getState(),
    );
    discardSelectedRaw();
  };
  const [autopilotEnabled, setAutopilotEnabled] = useState(false);
  const autopilot = useAutopilot(
    autopilotEnabled,
    isScoring,
    { play: submitHand, discard: discardSelected },
    () => setAutopilotEnabled(false),
  );
  const autopilotExplanation = useMoveExplanation();
  const autopilotProposal = autopilot.pendingProposal;
  const skipExplanationResetRef = useRef(false);
  useEffect(() => {
    if (skipExplanationResetRef.current) {
      skipExplanationResetRef.current = false;
      return;
    }
    autopilotExplanation.reset();
  }, [autopilotProposal, autopilotExplanation.reset]);
  const askAiForMove = (): void => {
    void autopilotExplanation.suggestMove().then((picked) => {
      if (picked !== null) {
        skipExplanationResetRef.current = true;
        autopilot.setProposal(picked);
      }
    });
  };
  const policyDecision =
    autopilot.pendingDecision !== null &&
    autopilot.pendingProposal === autopilot.pendingDecision.action
      ? autopilot.pendingDecision
      : null;
  const pendingDecision = autopilot.pendingDecision;
  useEffect(() => {
    if (pendingDecision !== null) rememberHandAdvice(pendingDecision);
  }, [pendingDecision]);
  useEffect(() => () => clearHandAdvice(), []);
  const {
    recorded: autopilotFeedbackRecorded,
    markRecorded: markAutopilotFeedbackRecorded,
    clear: clearAutopilotFeedbackNotice,
  } = useAdviceFeedbackNotice(isScoring);
  useEffect(() => {
    if (autopilotProposal !== null) clearAutopilotFeedbackNotice();
  }, [autopilotProposal, clearAutopilotFeedbackNotice]);
  const handleAutopilotFeedback = (correctedIndex: number | null): void => {
    if (policyDecision === null) return;
    captureAdviceFeedback(
      useGame.getState(),
      buildHandPolicyFeedbackEvent(policyDecision, correctedIndex),
    );
    clearHandAdvice();
    markAutopilotFeedbackRecorded();
    const corrected =
      correctedIndex !== null
        ? policyDecision.candidates[correctedIndex]
        : undefined;
    if (corrected !== undefined) {
      autopilot.approveOption(corrected);
    } else {
      autopilot.dismissProposal();
    }
  };
  const handleAutopilotAgree = (): void => {
    if (policyDecision !== null) {
      captureAdviceFeedback(
        useGame.getState(),
        buildHandPolicyFeedbackEvent(
          policyDecision,
          policyDecision.recommendationIndex,
          "explicit",
          "good",
        ),
      );
      markAutopilotFeedbackRecorded();
    }
    clearHandAdvice();
    autopilot.approve();
  };
  const { startNewRound, startNewGame, confirmRunSelection, loseGame, skipBlind } =
    useRoundLifecycle({
      applyGainedTag,
      resetScoring,
      resetDiscardPipeline,
    });
  loseGameRef.current = loseGame;

  // Round-won modal: when non-null, the player has met the required score and
  // the modal is showing. Dismissal triggers handleWin().
  const pendingWin = useGame((state) => state.pendingWin);
  const setPendingWin = useGame((state) => state.setPendingWin);
  const pendingLose = useGame((state) => state.pendingLose);
  const pendingGameWon = useGame((state) => state.pendingGameWon);
  const setPendingGameWon = useGame((state) => state.setPendingGameWon);
  const setPendingLose = useGame((state) => state.setPendingLose);

  const shopOffers = useGame((state) => state.shopOffers);
  const setShopOffers = useGame((state) => state.setShopOffers);
  const setSoldJokerIdsThisShopVisit = useGame(
    (state) => state.setSoldJokerIdsThisShopVisit,
  );
  const consumables = useGame((state) => state.consumables);
  const setConsumables = useGame((state) => state.setConsumables);
  const pendingRunSelect = useGame((state) => state.pendingRunSelect);
  useEffect(() => {
    if (didRestoreFromSnapshot()) return;
    if (pendingRunSelect) return;
    const seeded = readSeededConsumables();
    if (seeded.length > 0) setConsumables(seeded);
  }, [pendingRunSelect, setConsumables]);
  const openedPack = useGame((state) => state.openedPack);
  const skipTagOffers = useGame((state) => state.skipTagOffers);
  const setSkipTagOffers = useGame((state) => state.setSkipTagOffers);
  useEffect(() => {
    if (didRestoreFromSnapshot()) return;
    setSkipTagOffers(rollAnteSkipOffers(tagOfferRngConfig.rng));
  }, [setSkipTagOffers]);
  const pendingShopMods = useGame((state) => state.pendingShopMods);
  const setPendingShopMods = useGame((state) => state.setPendingShopMods);
  const pendingBlindSelect = useGame((state) => state.pendingBlindSelect);
  const setPendingBlindSelect = useGame(
    (state) => state.setPendingBlindSelect,
  );
  const pendingJokerGrantIds = useGame(
    (state) => state.pendingJokerGrantIds,
  );
  const setPendingJokerGrantIds = useGame(
    (state) => state.setPendingJokerGrantIds,
  );
  const selectedStake = useGame((state) => state.selectedStake);
  const selectedDeck = useGame((state) => state.selectedDeck);
  const pendingTags = useGame((state) => state.pendingTags);
  const setPendingTags = useGame((state) => state.setPendingTags);
  const ownedVoucherIds = useGame((state) => state.ownedVoucherIds);
  const currentAnteVouchers = useGame((state) => state.currentAnteVouchers);
  const setCurrentAnteVouchers = useGame(
    (state) => state.setCurrentAnteVouchers,
  );
  useEffect(() => {
    if (didRestoreFromSnapshot()) return;
    setCurrentAnteVouchers(
      pickVouchersForAnte({ ante: 1, ownedIds: new Set() }, BASE_VOUCHER_SLOTS),
    );
  }, [setCurrentAnteVouchers]);
  const soldVoucherIds = useGame((state) => state.soldVoucherIds);
  const currentBoss = useGame((state) => state.currentBoss);
  const bossRerollsUsedThisAnte = useGame(
    (state) => state.bossRerollsUsedThisAnte,
  );
  const handHistoryThisRound = useGame((state) => state.handHistoryThisRound);
  const firstPlayedHandLabel = handHistoryThisRound[0] ?? null;
  const setCurrentBoss = useGame((state) => state.setCurrentBoss);
  useEffect(() => {
    if (didRestoreFromSnapshot()) return;
    setCurrentBoss(pickBossForAnte({ ante: 1 }));
  }, [setCurrentBoss]);
  const requiredScore = requiredChipsForBlind({
    ante,
    blind,
    boss: currentBoss,
    stake: selectedStake,
  });

  const handleWin = useGame((s) => s.handleWin);

  useEffect(() => {
    if (didRestoreFromSnapshot()) return;
    if (shouldBootIntoShop()) bootIntoShop();
  }, []);

  const consumableCapacity =
    MAX_CONSUMABLE_SLOTS + extraConsumableSlots(ownedVoucherIds);
  const jokerCapacity = Math.max(
    0,
    MAX_JOKERS +
      extraJokerSlots(ownedVoucherIds) +
      deckJokerSlotsDelta(selectedDeck),
  );


  const shopProps = useShopController();

  function confirmBlindSelect() {
    setPendingBlindSelect(false);
    startNewRound();
  }

  const packOpenProps = usePackOpenController();

  function dismissRoundWonModal() {
    const precomputed = pendingWin
      ? { interest: pendingWin.interest, interestWallet: pendingWin.interestWallet }
      : undefined;
    setPendingWin(null);
    handleWin(precomputed);
  }

  function dismissRoundLostModal() {
    setPendingLose(null);
    startNewGame();
  }

  function dismissGameWonScreen() {
    setPendingGameWon(null);
    startNewGame();
  }

  const continueEndless = useGame((s) => s.continueEndless);

  const appStyle = hasUserOverriddenAnimationSpeed(animationSpeed)
    ? ({
        "--animation-speed": String(getAnimationSpeedMultiplier(animationSpeed)),
      } as React.CSSProperties)
    : undefined;

  return (
    <div
      className="app"
      data-app-shell=""
      data-deck={selectedDeck}
      style={appStyle}
      data-hands-played={runStats.handsPlayed}
      data-unused-discards={runStats.unusedDiscards}
      data-blinds-skipped={runStats.blindsSkipped}
    >
      <h1 className="sr-only">
        {pendingRunSelect ? t("app.titleMenu") : t("app.titleRun")}
      </h1>
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
        firstPlayedHandLabel={firstPlayedHandLabel}
        scoringEvents={scoringEvents}
        onNewGame={startNewGame}
      />
      <Game
        onSubmitHand={submitHand}
        onDiscard={discardSelected}
        autopilotEnabled={autopilotEnabled}
        onToggleAutopilot={() => setAutopilotEnabled((prev) => !prev)}
        autopilotProposal={autopilot.pendingProposal}
        autopilotModelProgress={autopilot.modelProgress}
        autopilotProposalUnavailable={autopilot.proposalUnavailable}
        autopilotAdvisorUnavailable={autopilot.advisorUnavailable}
        autopilotExplanation={autopilotExplanation.state}
        autopilotFeedbackCandidates={policyDecision?.candidates ?? null}
        autopilotFeedbackRecorded={autopilotFeedbackRecorded}
        onApproveAutopilot={autopilot.approve}
        onAskAiAutopilot={askAiForMove}
        onRetryAutopilot={askAiForMove}
        onAutopilotFeedback={handleAutopilotFeedback}
        onAutopilotAgree={handleAutopilotAgree}
        onAutopilotPreviewFeedback={autopilot.previewOption}
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
        shop={shopProps}
        packOpen={packOpenProps}
        onCardDiscardEnd={handleCardDiscardEnd}
      />
      {pendingWin && (
        <LazyChunkErrorBoundary>
          <Suspense fallback={<LazyChunkSpinner variant="overlay" />}>
            <RoundWonModal info={pendingWin} onContinue={dismissRoundWonModal} />
          </Suspense>
        </LazyChunkErrorBoundary>
      )}
      {pendingLose && (
        <LazyChunkErrorBoundary>
          <Suspense fallback={<LazyChunkSpinner variant="overlay" />}>
            <RoundLostModal info={pendingLose} onContinue={dismissRoundLostModal} />
          </Suspense>
        </LazyChunkErrorBoundary>
      )}
      {pendingGameWon && (
        <LazyChunkErrorBoundary>
          <Suspense fallback={<LazyChunkSpinner variant="overlay" />}>
            <GameWonScreen
              info={pendingGameWon}
              onNewRun={dismissGameWonScreen}
              onEndless={continueEndless}
            />
          </Suspense>
        </LazyChunkErrorBoundary>
      )}
      {pendingRunSelect && (
        <NewRunScreen
          initialStake={selectedStake}
          initialDeck={selectedDeck}
          onConfirm={({ stake, deck }) => {
            confirmRunSelection({ stake, deck });
          }}
        />
      )}
      {pendingJokerGrantIds.length > 0 && (
        <LazyChunkErrorBoundary>
          <Suspense fallback={<LazyChunkSpinner variant="overlay" />}>
            <JokerGrantAcknowledge
              jokers={pendingJokerGrantIds.flatMap((id) => {
                const j = jokers.find((joker) => joker.id === id);
                return j ? [j] : [];
              })}
              onAcknowledge={() => setPendingJokerGrantIds([])}
            />
          </Suspense>
        </LazyChunkErrorBoundary>
      )}
      {pendingBlindSelect &&
        !pendingRunSelect &&
        openedPack === null &&
        pendingJokerGrantIds.length === 0 && (
          <LazyChunkErrorBoundary>
            <Suspense fallback={<LazyChunkSpinner variant="overlay" />}>
              <BlindSelectScreenLazy
                ante={ante}
                currentBlind={blind}
                boss={currentBoss}
                stake={selectedStake}
                onPlay={confirmBlindSelect}
                onSkip={skipBlind}
                tags={pendingTags}
                skipRewards={skipTagOffers}
                bossOptions={
                  devToolsEnabled()
                    ? availableBosses(createBossCatalog(), ante)
                    : undefined
                }
                onSetBoss={
                  devToolsEnabled()
                    ? (id) => {
                        const next = createBossCatalog().find(
                          (b) => b.id === id,
                        );
                        if (next) setCurrentBoss(next);
                      }
                    : undefined
                }
                onRerollBoss={() => {
                  useGame.getState().rerollBoss();
                }}
                bossRerollsRemaining={bossRerollsRemaining(
                  ownedVoucherIds,
                  bossRerollsUsedThisAnte,
                )}
                bossRerollCost={BOSS_REROLL_COST}
                canAffordBossReroll={money >= BOSS_REROLL_COST}
              />
            </Suspense>
          </LazyChunkErrorBoundary>
        )}
      <LiveAnnouncer />
      <AdminModeController />
      <BossEffectToast />
    </div>
  );
}

export default App;
