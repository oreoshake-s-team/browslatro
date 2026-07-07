import { useCallback } from "react";
import { useGame } from "../store/game";
import type { RoundWonInfo } from "../components/game/RoundWonModal";
import type { RoundLostInfo } from "../components/game/RoundLostModal";
import type { GameWonInfo } from "../store/progression";

export interface GameModals {
  readonly pendingWin: RoundWonInfo | null;
  readonly pendingLose: RoundLostInfo | null;
  readonly pendingGameWon: GameWonInfo | null;
  readonly dismissRoundWon: () => void;
  readonly dismissRoundLost: () => void;
  readonly dismissGameWon: () => void;
  readonly continueEndless: () => void;
}

export function useGameModals(startNewGame: () => void): GameModals {
  const pendingWin = useGame((state) => state.pendingWin);
  const setPendingWin = useGame((state) => state.setPendingWin);
  const pendingLose = useGame((state) => state.pendingLose);
  const setPendingLose = useGame((state) => state.setPendingLose);
  const pendingGameWon = useGame((state) => state.pendingGameWon);
  const setPendingGameWon = useGame((state) => state.setPendingGameWon);
  const handleWin = useGame((state) => state.handleWin);
  const continueEndless = useGame((state) => state.continueEndless);

  const dismissRoundWon = useCallback((): void => {
    const precomputed = pendingWin
      ? {
          interest: pendingWin.interest,
          interestWallet: pendingWin.interestWallet,
        }
      : undefined;
    setPendingWin(null);
    handleWin(precomputed);
  }, [pendingWin, setPendingWin, handleWin]);

  const dismissRoundLost = useCallback((): void => {
    setPendingLose(null);
    startNewGame();
  }, [setPendingLose, startNewGame]);

  const dismissGameWon = useCallback((): void => {
    setPendingGameWon(null);
    startNewGame();
  }, [setPendingGameWon, startNewGame]);

  return {
    pendingWin,
    pendingLose,
    pendingGameWon,
    dismissRoundWon,
    dismissRoundLost,
    dismissGameWon,
    continueEndless,
  };
}
