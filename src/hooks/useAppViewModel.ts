import { useShallow } from "zustand/react/shallow";
import { useGame, type GameState } from "../store/game";

export type AppViewModel = Pick<
  GameState,
  | "blind"
  | "ante"
  | "money"
  | "remainingDiscards"
  | "runStats"
  | "selectedIds"
  | "discardingIds"
  | "jokers"
  | "pendingRunSelect"
  | "openedPack"
  | "skipTagOffers"
  | "pendingBlindSelect"
  | "pendingJokerGrantIds"
  | "selectedStake"
  | "selectedDeck"
  | "pendingTags"
  | "ownedVoucherIds"
  | "currentBoss"
  | "bossRerollsUsedThisAnte"
>;

export function useAppViewModel(): AppViewModel {
  return useGame(
    useShallow((state) => ({
      blind: state.blind,
      ante: state.ante,
      money: state.money,
      remainingDiscards: state.remainingDiscards,
      runStats: state.runStats,
      selectedIds: state.selectedIds,
      discardingIds: state.discardingIds,
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
}
