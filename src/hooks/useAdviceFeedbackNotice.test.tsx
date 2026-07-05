import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import { useAdviceFeedbackNotice } from "./useAdviceFeedbackNotice";
import { useGame } from "../store/game";
import type { Card } from "../cards/types";

function card(id: number): Card {
  return { id, rank: "5", suit: "clubs" };
}

beforeEach(() => {
  useGame.getState().resetGame();
});

describe("useAdviceFeedbackNotice", () => {
  test("markRecorded shows the notice", () => {
    const { result } = renderHook(() => useAdviceFeedbackNotice(false));
    act(() => result.current.markRecorded());
    expect(result.current.recorded).toBe(true);
  });

  test("clear hides the notice", () => {
    const { result } = renderHook(() => useAdviceFeedbackNotice(false));
    act(() => result.current.markRecorded());
    act(() => result.current.clear());
    expect(result.current.recorded).toBe(false);
  });

  test("dealing a new hand hides the notice", () => {
    const { result } = renderHook(() => useAdviceFeedbackNotice(false));
    act(() => result.current.markRecorded());
    act(() =>
      useGame.getState().setDealt({ hand: [card(1), card(2)], remaining: [] }),
    );
    expect(result.current.recorded).toBe(false);
  });

  test("changing the card selection while idle hides the notice", () => {
    const { result } = renderHook(() => useAdviceFeedbackNotice(false));
    act(() => result.current.markRecorded());
    act(() => useGame.getState().selectCards([1]));
    expect(result.current.recorded).toBe(false);
  });

  test("selection changes while scoring keep the notice visible", () => {
    const { result } = renderHook(() => useAdviceFeedbackNotice(true));
    act(() => result.current.markRecorded());
    act(() => useGame.getState().selectCards([1]));
    expect(result.current.recorded).toBe(true);
  });

  test("selection changes during the discard animation keep the notice visible", () => {
    const { result } = renderHook(() => useAdviceFeedbackNotice(false));
    act(() => useGame.getState().setDiscardingIds(new Set([9])));
    act(() => result.current.markRecorded());
    act(() => useGame.getState().selectCards([1]));
    expect(result.current.recorded).toBe(true);
  });

  test("the notice stays hidden when the hand changes without prior feedback", () => {
    const { result } = renderHook(() => useAdviceFeedbackNotice(false));
    act(() =>
      useGame.getState().setDealt({ hand: [card(1)], remaining: [] }),
    );
    expect(result.current.recorded).toBe(false);
  });
});
