import { useShallow } from "zustand/react/shallow";
import { useGame, type GameState } from "../store/game";

export type AppViewModel = Pick<
  GameState,
  | "blind"
  | "round"
  | "ante"
  | "money"
  | "chips"
  | "multiplier"
  | "devChipsBonus"
  | "devMultBonus"
  | "devMultFactor"
  | "roundScore"
  | "selectedHand"
  | "remainingHands"
  | "remainingDiscards"
  | "runStats"
  | "selectedIds"
  | "discardingIds"
  | "jokers"
  | "handPlayCounts"
  | "handStats"
  | "scoringEvents"
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
  | "handHistoryThisRound"
>;

export function useAppViewModel(): AppViewModel {
  return useGame(
    useShallow((state) => ({
      blind: state.blind,
      round: state.round,
      ante: state.ante,
      money: state.money,
      chips: state.chips,
      multiplier: state.multiplier,
      // Dev "Apply modifiers" offsets. Sticky across selection/scoring/finalize
      // so the displayed chips/multiplier reflect manual bumps until a New game
      // resets them.
      devChipsBonus: state.devChipsBonus,
      devMultBonus: state.devMultBonus,
      devMultFactor: state.devMultFactor,
      roundScore: state.roundScore,
      selectedHand: state.selectedHand,
      remainingHands: state.remainingHands,
      remainingDiscards: state.remainingDiscards,
      runStats: state.runStats,
      selectedIds: state.selectedIds,
      discardingIds: state.discardingIds,
      jokers: state.jokers,
      handPlayCounts: state.handPlayCounts,
      handStats: state.handStats,
      scoringEvents: state.scoringEvents,
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
      handHistoryThisRound: state.handHistoryThisRound,
    })),
  );
}
