import { useShallow } from "zustand/react/shallow";
import { useGame, type GameState } from "../store/game";

export type AppViewModel = Pick<
  GameState,
  "runStats" | "pendingRunSelect" | "selectedDeck"
>;

export function useAppViewModel(): AppViewModel {
  return useGame(
    useShallow((state) => ({
      runStats: state.runStats,
      pendingRunSelect: state.pendingRunSelect,
      selectedDeck: state.selectedDeck,
    })),
  );
}
