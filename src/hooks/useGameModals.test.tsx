import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { RoundWonInfo } from "../components/game/RoundWonModal";
import { useGame } from "../store/game";
import { useGameModals } from "./useGameModals";

function winInfo(overrides: Partial<RoundWonInfo> = {}): RoundWonInfo {
  return {
    roundScore: 400,
    requiredScore: 300,
    baseReward: 3,
    walletAtPayout: 0,
    interestWallet: 0,
    interest: 0,
    goldHeldCount: 0,
    remainingHandsCount: 0,
    ...overrides,
  };
}

beforeEach(() => {
  useGame.getState().resetGame();
});

describe("useGameModals — dismissRoundWon payout threading", () => {
  test("pays the blind reward shown by the modal on a normal win", () => {
    useGame.getState().setMoney(0);
    useGame.getState().setPendingWin(winInfo());
    const { result } = renderHook(() => useGameModals(vi.fn()));
    act(() => result.current.dismissRoundWon());
    expect(useGame.getState().money).toBe(3);
  });

  test("pays no blind reward when the modal showed a Mr. Bones save", () => {
    useGame.getState().setMoney(0);
    useGame
      .getState()
      .setPendingWin(winInfo({ baseReward: 0, savedByMrBones: true }));
    const { result } = renderHook(() => useGameModals(vi.fn()));
    act(() => result.current.dismissRoundWon());
    expect(useGame.getState().money).toBe(0);
  });

  test("still pays the modal's interest on a Mr. Bones save", () => {
    useGame.getState().setMoney(0);
    useGame.getState().setPendingWin(
      winInfo({
        baseReward: 0,
        savedByMrBones: true,
        interest: 5,
        interestWallet: 25,
      }),
    );
    const { result } = renderHook(() => useGameModals(vi.fn()));
    act(() => result.current.dismissRoundWon());
    expect(useGame.getState().money).toBe(5);
  });

  test("clears the pending win when dismissed", () => {
    useGame.getState().setPendingWin(winInfo());
    const { result } = renderHook(() => useGameModals(vi.fn()));
    act(() => result.current.dismissRoundWon());
    expect(useGame.getState().pendingWin).toBeNull();
  });
});
