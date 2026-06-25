import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { usePlayHand, type UsePlayHandParams } from "./usePlayHand";
import { useGame } from "../store/game";
import { createBossCatalog } from "../items/bosses";
import { applyPlanetUpgrade } from "../items/planets";
import { createPlanetCatalog } from "../items/planets";
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

describe("usePlayHand — hand counter decrements at play time", () => {
  function setupPlayablePair(remainingHands: number): void {
    useGame.getState().setBlind(1);
    useGame.getState().setDealt({
      hand: [card(1, "5", "clubs"), card(2, "5", "hearts")],
      remaining: [card(3, "9", "spades")],
    });
    useGame.getState().setHandDisplayOrder([1, 2]);
    useGame.getState().setSelectedIds(new Set([1, 2]));
    useGame.getState().setRemainingHands(remainingHands);
    useGame.getState().setRoundScore(0);
  }

  test("a played hand decrements remainingHands the moment it is submitted", () => {
    setupPlayablePair(4);
    const { result } = renderHook(() => usePlayHand(makeParams()));

    act(() => result.current.submitHand());

    expect(useGame.getState().remainingHands).toBe(3);
  });

  test("a hand that will win the round still decrements the counter at submit", () => {
    setupPlayablePair(4);
    useGame.getState().setRoundScore(1_000_000);
    const { result } = renderHook(() => usePlayHand(makeParams()));

    act(() => result.current.submitHand());

    expect(useGame.getState().remainingHands).toBe(3);
  });

  test("the final hand drops the counter to 0 as soon as it is submitted", () => {
    setupPlayablePair(1);
    const { result } = renderHook(() => usePlayHand(makeParams()));

    act(() => result.current.submitHand());

    expect(useGame.getState().remainingHands).toBe(0);
  });
});

describe("usePlayHand — The Mouth voids a non-matching hand", () => {
  const mouth = createBossCatalog().find((b) => b.id === "the-mouth")!;

  function setupLockedMouth(): void {
    useGame.getState().setCurrentBoss(mouth);
    useGame.getState().setBlind(3);
    useGame.getState().setHandHistoryThisRound(["Pair"]);
    useGame.getState().setDealt({
      hand: [card(1, "A", "spades")],
      remaining: [card(2, "3", "hearts")],
    });
    useGame.getState().setHandDisplayOrder([1]);
    useGame.getState().setSelectedIds(new Set([1]));
    useGame.getState().setRemainingHands(4);
    useGame.getState().setRoundScore(0);
  }

  test("a non-matching hand does NOT advance the round score", () => {
    setupLockedMouth();
    const { result } = renderHook(() => usePlayHand(makeParams()));

    act(() => result.current.submitHand());

    expect(useGame.getState().roundScore).toBe(0);
  });

  test("a non-matching hand still consumes a hand", () => {
    setupLockedMouth();
    const { result } = renderHook(() => usePlayHand(makeParams()));

    act(() => result.current.submitHand());

    expect(useGame.getState().remainingHands).toBe(3);
  });

  test("a non-matching hand records a boss-adjustment void note", () => {
    setupLockedMouth();
    const { result } = renderHook(() => usePlayHand(makeParams()));

    act(() => result.current.submitHand());

    expect(
      useGame
        .getState()
        .scoringEvents.some(
          (e) => e.kind === "boss-adjustment" && e.description.includes("voided"),
        ),
    ).toBe(true);
  });

  test("loses the game when the last hand is voided below the requirement", () => {
    setupLockedMouth();
    useGame.getState().setRemainingHands(1);
    const loseGame = vi.fn();
    const { result } = renderHook(() => usePlayHand(makeParams(loseGame)));

    act(() => result.current.submitHand());

    expect(loseGame).toHaveBeenCalled();
  });
});

describe("usePlayHand — The Arm lowers the played hand level", () => {
  const arm = createBossCatalog().find((b) => b.id === "the-arm")!;

  function setupArm(pairLevel: number): void {
    useGame.getState().setCurrentBoss(arm);
    useGame.getState().setBlind(3);
    if (pairLevel > 1) {
      const planet = createPlanetCatalog().find((p) =>
        p.hands.includes("Pair"),
      )!;
      let stats = useGame.getState().handStats;
      for (let i = 1; i < pairLevel; i += 1) {
        stats = applyPlanetUpgrade(stats, planet);
      }
      useGame.getState().setHandStats(stats);
    }
    useGame.getState().setDealt({
      hand: [card(1, "5", "clubs"), card(2, "5", "hearts")],
      remaining: [card(3, "9", "spades"), card(4, "2", "diamonds")],
    });
    useGame.getState().setHandDisplayOrder([1, 2]);
    useGame.getState().setSelectedIds(new Set([1, 2]));
    useGame.getState().setRemainingHands(4);
    useGame.getState().setRoundScore(0);
  }

  test("permanently lowers a level-2 played hand to level 1", () => {
    setupArm(2);
    const { result } = renderHook(() => usePlayHand(makeParams()));

    act(() => result.current.submitHand());

    expect(useGame.getState().handStats["Pair"].level).toBe(1);
  });

  test("floors at level 1 for an already level-1 hand (negative)", () => {
    setupArm(1);
    const { result } = renderHook(() => usePlayHand(makeParams()));

    act(() => result.current.submitHand());

    expect(useGame.getState().handStats["Pair"].level).toBe(1);
  });

  test("records a boss-adjustment note when it lowers a level", () => {
    setupArm(2);
    const { result } = renderHook(() => usePlayHand(makeParams()));

    act(() => result.current.submitHand());

    expect(
      useGame
        .getState()
        .scoringEvents.some((e) => e.kind === "boss-adjustment"),
    ).toBe(true);
  });
});

describe("usePlayHand — plays the live store selection", () => {
  test("submitHand plays the current store selection when it changed after render", () => {
    useGame.getState().setBlind(1);
    useGame.getState().setDealt({
      hand: [card(1, "5"), card(2, "5"), card(3, "K")],
      remaining: [],
    });
    useGame.getState().setHandDisplayOrder([1, 2, 3]);
    useGame.getState().setSelectedIds(new Set([3]));
    useGame.getState().setRemainingHands(4);
    const { result } = renderHook(() => usePlayHand(makeParams()));

    act(() => {
      useGame.getState().setSelectedIds(new Set([1, 2]));
      result.current.submitHand();
    });

    expect(useGame.getState().handPlayCounts.Pair).toBe(1);
  });
});
