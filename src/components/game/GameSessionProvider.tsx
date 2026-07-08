import { useRef, type ReactNode } from "react";
import { useGame } from "../../store/game";
import { recordHandFeedback } from "../../ai/advisor/shownHandAdvice";
import { usePreferences } from "../system/preferences";
import { useScoringStepMs } from "../../hooks/useScoringStepMs";
import { usePlayHand } from "../../hooks/usePlayHand";
import { useDiscardPipeline } from "../../hooks/useDiscardPipeline";
import { useTagDispatcher } from "../../hooks/useTagDispatcher";
import { useRoundLifecycle } from "../../hooks/useRoundLifecycle";
import { GameSessionContext, type GameSessionActions } from "./gameSession";

export default function GameSessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    pendingDiscardCountRef,
    pendingHandPlayResetRef,
    skipDrawAfterDiscardRef,
    handleCardDiscardEnd,
    discardSelected: discardSelectedRaw,
    resetForNewRound: resetDiscardPipeline,
  } = useDiscardPipeline();

  const { applyGainedTag } = useTagDispatcher();

  const animationSpeed = usePreferences((state) => state.animationSpeed);
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
  const { startNewRound, startNewGame, confirmRunSelection, loseGame, skipBlind } =
    useRoundLifecycle({
      applyGainedTag,
      resetScoring,
      resetDiscardPipeline,
    });
  loseGameRef.current = loseGame;

  const setPendingBlindSelect = useGame(
    (state) => state.setPendingBlindSelect,
  );
  const confirmBlindSelect = () => {
    setPendingBlindSelect(false);
    startNewRound();
  };

  const value: GameSessionActions = {
    submitHand,
    discardSelected,
    isScoring,
    currentScoringId,
    currentGoldScoringId,
    currentSteelScoringId,
    handleCardDiscardEnd,
    startNewGame,
    confirmRunSelection,
    skipBlind,
    confirmBlindSelect,
  };

  return (
    <GameSessionContext.Provider value={value}>
      {children}
    </GameSessionContext.Provider>
  );
}
