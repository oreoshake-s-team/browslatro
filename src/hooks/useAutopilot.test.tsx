import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { CandidateRanker } from "../ai/policy";
import type { Card } from "../cards/types";
import { useGame } from "../store/game";
import { useAutopilot, type AutopilotDeps } from "./useAutopilot";

function pairHand(): Card[] {
  return [
    { id: 1, rank: "9", suit: "hearts" },
    { id: 2, rank: "9", suit: "spades" },
    { id: 3, rank: "K", suit: "clubs" },
    { id: 4, rank: "4", suit: "diamonds" },
    { id: 5, rank: "7", suit: "hearts" },
  ];
}

const playFirstRanker: CandidateRanker = {
  rank: async (_state, candidates) => {
    const indices = candidates.map((_, index) => index);
    return indices.sort((a, b) => {
      const left = candidates[a].action === "play" ? 0 : 1;
      const right = candidates[b].action === "play" ? 0 : 1;
      return left - right;
    });
  },
};

const discardFirstRanker: CandidateRanker = {
  rank: async (_state, candidates) => {
    const indices = candidates.map((_, index) => index);
    return indices.sort((a, b) => {
      const left = candidates[a].action === "discard" ? 0 : 1;
      const right = candidates[b].action === "discard" ? 0 : 1;
      return left - right;
    });
  },
};

function makeDeps(ranker: CandidateRanker): AutopilotDeps {
  return {
    ranker,
    getState: () => useGame.getState(),
    stepMs: 10,
  };
}

function makeExecutor() {
  return { play: vi.fn<() => void>(), discard: vi.fn<() => void>() };
}

beforeEach(() => {
  useGame.getState().resetGame();
  useGame.getState().setDealt({ hand: pairHand(), remaining: [] });
  useGame.setState({ pendingBlindSelect: false, pendingRunSelect: false });
});

describe("useAutopilot", () => {
  test("plays the top-ranked candidate after the step delay", async () => {
    const executor = makeExecutor();
    renderHook(() =>
      useAutopilot(true, false, executor, makeDeps(playFirstRanker)),
    );
    await waitFor(() => expect(executor.play).toHaveBeenCalled());
  });

  test("applies the planned selection before playing", async () => {
    const executor = makeExecutor();
    renderHook(() =>
      useAutopilot(true, false, executor, makeDeps(playFirstRanker)),
    );
    await waitFor(() => expect(executor.play).toHaveBeenCalled());
    expect(useGame.getState().selectedIds.size).toBeGreaterThan(0);
  });

  test("discards when the ranker prefers a discard", async () => {
    const executor = makeExecutor();
    renderHook(() =>
      useAutopilot(true, false, executor, makeDeps(discardFirstRanker)),
    );
    await waitFor(() => expect(executor.discard).toHaveBeenCalled());
  });

  test("does nothing while disabled", async () => {
    const executor = makeExecutor();
    renderHook(() =>
      useAutopilot(false, false, executor, makeDeps(playFirstRanker)),
    );
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(executor.play).not.toHaveBeenCalled();
  });

  test("does nothing while scoring", async () => {
    const executor = makeExecutor();
    renderHook(() =>
      useAutopilot(true, true, executor, makeDeps(playFirstRanker)),
    );
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(executor.play).not.toHaveBeenCalled();
  });

  test("does nothing while the shop is open", async () => {
    useGame.setState({ shopOffers: [] });
    const executor = makeExecutor();
    renderHook(() =>
      useAutopilot(true, false, executor, makeDeps(playFirstRanker)),
    );
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(executor.play).not.toHaveBeenCalled();
  });
});
