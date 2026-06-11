import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { CandidateRanker } from "../ai/policy";
import type { Card } from "../cards/types";
import { useGame } from "../store/game";
import {
  useAutopilot,
  type AutopilotControls,
  type AutopilotDeps,
  type AutopilotExecutor,
} from "./useAutopilot";

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
  load: async () => {},
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
  load: async () => {},
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

function makeExecutor(): AutopilotExecutor & {
  play: ReturnType<typeof vi.fn>;
  discard: ReturnType<typeof vi.fn>;
} {
  return { play: vi.fn<() => void>(), discard: vi.fn<() => void>() };
}

function renderAutopilot(options: {
  enabled?: boolean;
  isScoring?: boolean;
  executor: AutopilotExecutor;
  ranker: CandidateRanker;
  onStop?: () => void;
}) {
  return renderHook(() =>
    useAutopilot(
      options.enabled ?? true,
      options.isScoring ?? false,
      options.executor,
      options.onStop ?? vi.fn(),
      makeDeps(options.ranker),
    ),
  );
}

async function waitForProposal(result: {
  current: AutopilotControls;
}): Promise<void> {
  await waitFor(() => expect(result.current.pendingProposal).not.toBeNull());
}

beforeEach(() => {
  useGame.getState().resetGame();
  useGame.getState().setDealt({ hand: pairHand(), remaining: [] });
  useGame.setState({ pendingBlindSelect: false, pendingRunSelect: false });
});

describe("useAutopilot", () => {
  test("proposes the top-ranked play after the step delay", async () => {
    const { result } = renderAutopilot({
      executor: makeExecutor(),
      ranker: playFirstRanker,
    });
    await waitForProposal(result);
    expect(result.current.pendingProposal?.action).toBe("play");
  });

  test("selects the proposed cards while awaiting approval", async () => {
    const { result } = renderAutopilot({
      executor: makeExecutor(),
      ranker: playFirstRanker,
    });
    await waitForProposal(result);
    expect(useGame.getState().selectedIds.size).toBeGreaterThan(0);
  });

  test("does not execute the move before it is approved", async () => {
    const executor = makeExecutor();
    const { result } = renderAutopilot({ executor, ranker: playFirstRanker });
    await waitForProposal(result);
    expect(executor.play).not.toHaveBeenCalled();
  });

  test("approve plays the proposed move", async () => {
    const executor = makeExecutor();
    const { result } = renderAutopilot({ executor, ranker: playFirstRanker });
    await waitForProposal(result);
    act(() => result.current.approve());
    expect(executor.play).toHaveBeenCalledTimes(1);
  });

  test("approve re-applies the proposed selection before playing", async () => {
    const { result } = renderAutopilot({
      executor: makeExecutor(),
      ranker: playFirstRanker,
    });
    await waitForProposal(result);
    const proposed = new Set(result.current.pendingProposal?.cardIds);
    act(() => result.current.approve());
    expect(useGame.getState().selectedIds).toEqual(proposed);
  });

  test("proposes a discard when the ranker prefers a discard", async () => {
    const { result } = renderAutopilot({
      executor: makeExecutor(),
      ranker: discardFirstRanker,
    });
    await waitForProposal(result);
    expect(result.current.pendingProposal?.action).toBe("discard");
  });

  test("approve discards when the proposal is a discard", async () => {
    const executor = makeExecutor();
    const { result } = renderAutopilot({ executor, ranker: discardFirstRanker });
    await waitForProposal(result);
    act(() => result.current.approve());
    expect(executor.discard).toHaveBeenCalledTimes(1);
  });

  test("stop clears the pending proposal", async () => {
    const { result } = renderAutopilot({
      executor: makeExecutor(),
      ranker: playFirstRanker,
    });
    await waitForProposal(result);
    act(() => result.current.stop());
    expect(result.current.pendingProposal).toBeNull();
  });

  test("stop calls onStop to disable autopilot", async () => {
    const onStop = vi.fn();
    const { result } = renderAutopilot({
      executor: makeExecutor(),
      ranker: playFirstRanker,
      onStop,
    });
    await waitForProposal(result);
    act(() => result.current.stop());
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  test("does not propose while disabled", async () => {
    const { result } = renderAutopilot({
      enabled: false,
      executor: makeExecutor(),
      ranker: playFirstRanker,
    });
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(result.current.pendingProposal).toBeNull();
  });

  test("does not propose while scoring", async () => {
    const { result } = renderAutopilot({
      isScoring: true,
      executor: makeExecutor(),
      ranker: playFirstRanker,
    });
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(result.current.pendingProposal).toBeNull();
  });

  test("does not propose while the shop is open", async () => {
    useGame.setState({ shopOffers: [] });
    const { result } = renderAutopilot({
      executor: makeExecutor(),
      ranker: playFirstRanker,
    });
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(result.current.pendingProposal).toBeNull();
  });
});
