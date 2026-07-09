import { useShallow } from "zustand/react/shallow";
import { useGame, type GameState } from "../store/game";

export type AppViewModel = Pick<
  GameState,
  | "remainingDiscards"
  | "runStats"
  | "selectedIds"
  | "discardingIds"
  | "pendingRunSelect"
  | "selectedDeck"
>;

export function useAppViewModel(): AppViewModel {
  return useGame(
    useShallow((state) => ({
      remainingDiscards: state.remainingDiscards,
      runStats: state.runStats,
      selectedIds: state.selectedIds,
      discardingIds: state.discardingIds,
      pendingRunSelect: state.pendingRunSelect,
      selectedDeck: state.selectedDeck,
    })),
  );
}
