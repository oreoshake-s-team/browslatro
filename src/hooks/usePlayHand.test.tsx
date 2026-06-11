import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { usePlayHand, type UsePlayHandParams } from "./usePlayHand";
import { useGame } from "../store/game";
import type { Card } from "../cards/types";

function card(id: number, rank: Card["rank"] = "5", suit: Card["suit"] = "clubs"): Card {
  return { id, rank, suit };
}

function makeParams(loseGame = vi.fn()): UsePlayHandParams {
  return {
    stepMs: 0,
    loseGame,
    pendingDiscardCountRef: { current: 0 },
    pendingHandPlayResetRef: { current: false },
    skipDrawAfterDiscardRef: { current: false },
  };
}

beforeEach(() => {
  useGame.getState().resetGame();
});

describe("usePlayHand — empty hand guard", () => {
  test("submitHand does NOT decrement remainingHands when no cards are selected", () => {
    useGame.getState().setDealt({ hand: [card(1), card(2)], remaining: [] });
    useGame.getState().setSelectedIds(new Set());
    useGame.getState().setRemainingHands(4);
    const { result } = renderHook(() => usePlayHand(makeParams()));

    act(() => result.current.submitHand());

    expect(useGame.getState().remainingHands).toBe(4);
  });

  test("submitHand does NOT call loseGame on the last hand when nothing is selected", () => {
    useGame.getState().setDealt({ hand: [card(1)], remaining: [] });
    useGame.getState().setSelectedIds(new Set());
    useGame.getState().setRemainingHands(1);
    const loseGame = vi.fn();
    const { result } = renderHook(() => usePlayHand(makeParams(loseGame)));

    act(() => result.current.submitHand());

    expect(loseGame).not.toHaveBeenCalled();
  });

  test("submitHand does NOT advance the round score when nothing is selected", () => {
    useGame.getState().setDealt({ hand: [card(1)], remaining: [] });
    useGame.getState().setSelectedIds(new Set());
    useGame.getState().setRoundScore(0);
    const { result } = renderHook(() => usePlayHand(makeParams()));

    act(() => result.current.submitHand());

    expect(useGame.getState().roundScore).toBe(0);
  });
});
