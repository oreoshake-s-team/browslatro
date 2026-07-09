import { Suspense, lazy } from "react";
import { useShallow } from "zustand/react/shallow";
import { useGame } from "../../store/game";
import { availableBosses, createBossCatalog } from "../../items/bosses";
import { devToolsEnabled } from "../../dev/devTools";
import { BOSS_REROLL_COST, bossRerollsRemaining } from "../../items/vouchers";
import { useGameModals } from "../../hooks/useGameModals";
import { useGameSession } from "./gameSession";
import LazyChunkErrorBoundary from "../system/LazyChunkErrorBoundary";
import LazyChunkSpinner from "../system/LazyChunkSpinner";
import NewRunScreen from "./NewRunScreen";

const BlindSelectScreenLazy = lazy(() => import("./BlindSelectScreen"));
const JokerGrantAcknowledge = lazy(
  () => import("../jokers/JokerGrantAcknowledge"),
);
const RoundWonModal = lazy(() => import("./RoundWonModal"));
const RoundLostModal = lazy(() => import("./RoundLostModal"));
const GameWonScreen = lazy(() => import("./GameWonScreen"));

export default function AppOverlays() {
  const {
    blind,
    ante,
    money,
    jokers,
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
  } = useGame(
    useShallow((state) => ({
      blind: state.blind,
      ante: state.ante,
      money: state.money,
      jokers: state.jokers,
      pendingRunSelect: state.pendingRunSelect,
      openedPack: state.openedPack,
      skipTagOffers: state.skipTagOffers,
      pendingBlindSelect: state.pendingBlindSelect,
      pendingJokerGrantIds: state.pendingJokerGrantIds,
      selectedStake: state.selectedStake,
      selectedDeck: state.selectedDeck,
      pendingTags: state.pendingTags,
      ownedVoucherIds: state.ownedVoucherIds,
      currentBoss: state.currentBoss,
      bossRerollsUsedThisAnte: state.bossRerollsUsedThisAnte,
    })),
  );
  const setPendingJokerGrantIds = useGame(
    (state) => state.setPendingJokerGrantIds,
  );
  const setCurrentBoss = useGame((state) => state.setCurrentBoss);

  const { startNewGame, confirmRunSelection, skipBlind, confirmBlindSelect } =
    useGameSession();

  const {
    pendingWin,
    pendingLose,
    pendingGameWon,
    dismissRoundWon,
    dismissRoundLost,
    dismissGameWon,
    continueEndless,
  } = useGameModals(startNewGame);

  return (
    <>
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
    </>
  );
}
