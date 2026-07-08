import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "../../store/game";
import { requiredChipsForBlind } from "../../scoring/anteScaling";
import { useSidebarViewModel } from "./useSidebarViewModel";

beforeEach(() => {
  useGame.getState().resetGame();
});

describe("useSidebarViewModel", () => {
  test("adds the dev chips bonus to the displayed chips", () => {
    useGame.getState().setChips(30);
    useGame.getState().setDevChipsBonus(12);
    const { result } = renderHook(() => useSidebarViewModel());
    expect(result.current.chips).toBe(42);
  });

  test("applies the dev mult bonus and factor to the displayed multiplier", () => {
    useGame.getState().setMultiplier(4);
    useGame.getState().setDevMultBonus(2);
    useGame.getState().setDevMultFactor(3);
    const { result } = renderHook(() => useSidebarViewModel());
    expect(result.current.multiplier).toBe(18);
  });

  test("leaves chips untouched when no dev bonus is set", () => {
    useGame.getState().setChips(30);
    const { result } = renderHook(() => useSidebarViewModel());
    expect(result.current.chips).toBe(30);
  });

  test("computes the required score from ante, blind, boss, and stake", () => {
    useGame.getState().setAnte(3);
    useGame.getState().setBlind(2);
    const { result } = renderHook(() => useSidebarViewModel());
    const state = useGame.getState();
    expect(result.current.requiredScore).toBe(
      requiredChipsForBlind({
        ante: 3,
        blind: 2,
        boss: state.currentBoss,
        stake: state.selectedStake,
      }),
    );
  });

  test("resolves owned voucher ids to catalog vouchers", () => {
    useGame.getState().setOwnedVoucherIds(new Set(["overstock", "grabber"]));
    const { result } = renderHook(() => useSidebarViewModel());
    expect(result.current.ownedVouchers.map((v) => v.id)).toEqual([
      "overstock",
      "grabber",
    ]);
  });

  test("returns no vouchers when none are owned", () => {
    const { result } = renderHook(() => useSidebarViewModel());
    expect(result.current.ownedVouchers).toEqual([]);
  });

  test("exposes the first hand played this round", () => {
    useGame.getState().setHandHistoryThisRound(["Flush", "Pair"]);
    const { result } = renderHook(() => useSidebarViewModel());
    expect(result.current.firstPlayedHandLabel).toBe("Flush");
  });

  test("first played hand is null before any hand is played", () => {
    const { result } = renderHook(() => useSidebarViewModel());
    expect(result.current.firstPlayedHandLabel).toBeNull();
  });
});
