import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import { useDiscardPipeline } from "./useDiscardPipeline";
import { useGame } from "../store/game";
import type { Card } from "../cards/types";

function seed(hand: ReadonlyArray<Card>, remaining: ReadonlyArray<Card>): void {
  useGame.getState().setDealt({ hand: [...hand], remaining: [...remaining] });
}

describe("useDiscardPipeline — negative regression (closes #803)", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
    useGame.getState().setJokers([]);
    useGame.getState().setRemainingDiscards(3);
  });

  test("a regular discard does NOT add the discarded card ids to destroyedCardIds", () => {
    const a: Card = { id: 1, rank: "A", suit: "spades" };
    const b: Card = { id: 2, rank: "K", suit: "hearts" };
    seed([a, b], []);
    useGame.getState().setSelectedIds(new Set([a.id]));
    const { result } = renderHook(() => useDiscardPipeline());
    act(() => result.current.discardSelected());
    act(() => result.current.handleCardDiscardEnd(a));
    expect(useGame.getState().destroyedCardIds.has(a.id)).toBe(false);
  });

  test("a regular discard removes the discarded card from dealt.hand", () => {
    const a: Card = { id: 1, rank: "A", suit: "spades" };
    const b: Card = { id: 2, rank: "K", suit: "hearts" };
    seed([a, b], []);
    useGame.getState().setSelectedIds(new Set([a.id]));
    const { result } = renderHook(() => useDiscardPipeline());
    act(() => result.current.discardSelected());
    act(() => result.current.handleCardDiscardEnd(a));
    expect(useGame.getState().dealt.hand.map((c) => c.id)).not.toContain(a.id);
  });

  test("destroyedCardIds stays empty across a full discard cycle with no jokers", () => {
    const a: Card = { id: 1, rank: "A", suit: "spades" };
    seed([a], []);
    useGame.getState().setSelectedIds(new Set([a.id]));
    const { result } = renderHook(() => useDiscardPipeline());
    act(() => result.current.discardSelected());
    act(() => result.current.handleCardDiscardEnd(a));
    expect(useGame.getState().destroyedCardIds.size).toBe(0);
  });
});
