import { Suspense, lazy, useEffect, useRef } from "react";
import { useBodyClass } from "./hooks/useBodyClass";
import { useTranslation } from "react-i18next";
import { useAutopilotController } from "./hooks/useAutopilotController";
import { recordHandFeedback } from "./ai/advisor/shownHandAdvice";

const BlindSelectScreenLazy = lazy(
  () => import("./components/game/BlindSelectScreen"),
);
const JokerGrantAcknowledge = lazy(
  () => import("./components/jokers/JokerGrantAcknowledge"),
);
import "./App.css";
import { useGame } from "./store/game";
import { requiredChipsForBlind } from "./scoring/anteScaling";
import { availableBosses, createBossCatalog } from "./items/bosses";
import { useChanceOverrides } from "./hooks/useChanceOverrides";
import { devToolsEnabled } from "./dev/devTools";
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
import Sidebar from "./components/hud/Sidebar";
import LiveAnnouncer from "./components/system/LiveAnnouncer";
import AdminModeController from "./components/system/AdminModeController";
import BossEffectToast from "./components/system/BossEffectToast";
import { usePreferences } from "./components/system/preferences";
import { useScoringStepMs } from "./hooks/useScoringStepMs";
import { useDevAnimationSpeedStyle } from "./hooks/useDevAnimationSpeedStyle";
import { useInitialDeal } from "./hooks/useInitialDeal";
import { usePlayHand } from "./hooks/usePlayHand";
import { useDiscardPipeline } from "./hooks/useDiscardPipeline";
import { useTagDispatcher } from "./hooks/useTagDispatcher";
import { useRoundLifecycle } from "./hooks/useRoundLifecycle";
import { useGameModals } from "./hooks/useGameModals";
import { useRunInitialization } from "./hooks/useRunInitialization";
import { useAppViewModel } from "./hooks/useAppViewModel";
import {
  initialJokersConfig,
} from "./items/jokers";
import {
  BOSS_REROLL_COST,
  bossRerollsRemaining,
  VOUCHER_CATALOG,
} from "./items/vouchers";

export { getScoringStepMs } from "./hooks/useScoringStepMs";

function App() {
  const { t } = useTranslation();
  const {
    blind,
    round,
    ante,
    money,
    chips,
    multiplier,
    devChipsBonus,
    devMultBonus,
    devMultFactor,
    roundScore,
    selectedHand,
    remainingHands,
    remainingDiscards,
    runStats,
    selectedIds,
    discardingIds,
    jokers,
    handPlayCounts,
    handStats,
    scoringEvents,
    pendingRunSelect,
    openedPack,
    skipTagOffers,
    pendingBlindSelect,
    pendingJokerGrantIds,
    selectedStake,
    selectedDeck,
    pendingTags,
    ownedVoucherIds,
    currentBoss,
    bossRerollsUsedThisAnte,
    handHistoryThisRound,
  } = useAppViewModel();
  useChanceOverrides();
  useInitialDeal();
  const highVisibility = usePreferences((state) => state.highVisibility);
  useBodyClass(highVisibility, "high-visibility");
  const dyslexicFont = usePreferences((state) => state.dyslexicFont);
  useBodyClass(dyslexicFont, "dyslexic-font");
  const animationSpeed = usePreferences((state) => state.animationSpeed);
  const setJokers = useGame((state) => state.setJokers);
  useEffect(() => {
    if (didRestoreFromSnapshot()) return;
    setJokers(initialJokersConfig.factory());
  }, [setJokers]);
  const {
    pendingDiscardCountRef,
    pendingHandPlayResetRef,
    skipDrawAfterDiscardRef,
    handleCardDiscardEnd,
    discardSelected: discardSelectedRaw,
    resetForNewRound: resetDiscardPipeline,
  } = useDiscardPipeline();

  const { applyGainedTag } = useTagDispatcher();

  const scoringStepMs = useScoringStepMs(animationSpeed);
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
  const {
    enabled: autopilotEnabled,
    onToggle: toggleAutopilot,
    autopilot,
    explanation: autopilotExplanation,
    onAskAi: askAiForMove,
    onFeedback: handleAutopilotFeedback,
    onAgree: handleAutopilotAgree,
    feedbackRecorded: autopilotFeedbackRecorded,
    policyDecision,
  } = useAutopilotController(isScoring, {
    play: submitHand,
    discard: discardSelected,
  });
  const { startNewRound, startNewGame, confirmRunSelection, loseGame, skipBlind } =
    useRoundLifecycle({
      applyGainedTag,
      resetScoring,
      resetDiscardPipeline,
    });
  loseGameRef.current = loseGame;

  const {
    pendingWin,
    pendingLose,
    pendingGameWon,
    dismissRoundWon,
    dismissRoundLost,
    dismissGameWon,
    continueEndless,
  } = useGameModals(startNewGame);

  useRunInitialization();

  const setPendingBlindSelect = useGame(
    (state) => state.setPendingBlindSelect,
  );
  const setPendingJokerGrantIds = useGame(
    (state) => state.setPendingJokerGrantIds,
  );
  const setCurrentBoss = useGame((state) => state.setCurrentBoss);
  const firstPlayedHandLabel = handHistoryThisRound[0] ?? null;
  const requiredScore = requiredChipsForBlind({
    ante,
    blind,
    boss: currentBoss,
    stake: selectedStake,
  });

  const shopProps = useShopController();

  function confirmBlindSelect() {
    setPendingBlindSelect(false);
    startNewRound();
  }

  const packOpenProps = usePackOpenController();

  const appStyle = useDevAnimationSpeedStyle(animationSpeed);

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
        onToggleAutopilot={toggleAutopilot}
        autopilotProposal={autopilot.pendingProposal}
        autopilotModelProgress={autopilot.modelProgress}
        autopilotProposalUnavailable={autopilot.proposalUnavailable}
        autopilotAdvisorUnavailable={autopilot.advisorUnavailable}
        autopilotExplanation={autopilotExplanation}
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
            <RoundWonModal info={pendingWin} onContinue={dismissRoundWon} />
          </Suspense>
        </LazyChunkErrorBoundary>
      )}
      {pendingLose && (
        <LazyChunkErrorBoundary>
          <Suspense fallback={<LazyChunkSpinner variant="overlay" />}>
            <RoundLostModal info={pendingLose} onContinue={dismissRoundLost} />
          </Suspense>
        </LazyChunkErrorBoundary>
      )}
      {pendingGameWon && (
        <LazyChunkErrorBoundary>
          <Suspense fallback={<LazyChunkSpinner variant="overlay" />}>
            <GameWonScreen
              info={pendingGameWon}
              onNewRun={dismissGameWon}
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
