import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useGame } from "../../store/game";
import { requiredChipsForBlind } from "../../scoring/anteScaling";
import { VOUCHER_CATALOG, type Voucher } from "../../items/vouchers";
import type { Blind, Hand } from "../../cards/types";
import type { HandLabel } from "../../scoring/handEvaluator";
import type { HandStats } from "../../scoring/handStats";
import type { BossBlind } from "../../items/bosses";
import type { ScoringEvent } from "../../scoring/scoringTrace";
import type { HandPlayCounts } from "./handPlayCounts";

export interface SidebarViewModel {
  readonly blind: Blind;
  readonly ante: number;
  readonly round: number;
  readonly money: number;
  readonly chips: number;
  readonly multiplier: number;
  readonly roundScore: number;
  readonly requiredScore: number;
  readonly selectedHand: Hand | null;
  readonly remainingHands: number;
  readonly remainingDiscards: number;
  readonly handPlayCounts: HandPlayCounts;
  readonly handStats: HandStats;
  readonly ownedVouchers: ReadonlyArray<Voucher>;
  readonly currentBoss: BossBlind;
  readonly firstPlayedHandLabel: HandLabel | null;
  readonly scoringEvents: ReadonlyArray<ScoringEvent>;
}

export function useSidebarViewModel(): SidebarViewModel {
  const state = useGame(
    useShallow((s) => ({
      blind: s.blind,
      ante: s.ante,
      round: s.round,
      money: s.money,
      chips: s.chips,
      multiplier: s.multiplier,
      devChipsBonus: s.devChipsBonus,
      devMultBonus: s.devMultBonus,
      devMultFactor: s.devMultFactor,
      roundScore: s.roundScore,
      selectedHand: s.selectedHand,
      remainingHands: s.remainingHands,
      remainingDiscards: s.remainingDiscards,
      handPlayCounts: s.handPlayCounts,
      handStats: s.handStats,
      ownedVoucherIds: s.ownedVoucherIds,
      currentBoss: s.currentBoss,
      handHistoryThisRound: s.handHistoryThisRound,
      scoringEvents: s.scoringEvents,
      selectedStake: s.selectedStake,
    })),
  );
  const ownedVouchers = useMemo(
    () => VOUCHER_CATALOG.filter((v) => state.ownedVoucherIds.has(v.id)),
    [state.ownedVoucherIds],
  );
  return {
    blind: state.blind,
    ante: state.ante,
    round: state.round,
    money: state.money,
    chips: state.chips + state.devChipsBonus,
    multiplier: (state.multiplier + state.devMultBonus) * state.devMultFactor,
    roundScore: state.roundScore,
    requiredScore: requiredChipsForBlind({
      ante: state.ante,
      blind: state.blind,
      boss: state.currentBoss,
      stake: state.selectedStake,
    }),
    selectedHand: state.selectedHand,
    remainingHands: state.remainingHands,
    remainingDiscards: state.remainingDiscards,
    handPlayCounts: state.handPlayCounts,
    handStats: state.handStats,
    ownedVouchers,
    currentBoss: state.currentBoss,
    firstPlayedHandLabel: state.handHistoryThisRound[0] ?? null,
    scoringEvents: state.scoringEvents,
  };
}
