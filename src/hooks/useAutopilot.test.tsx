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

function requireCandidate(
  result: { current: AutopilotControls },
  action: "play" | "discard",
) {
  const candidate = result.current.pendingDecision?.candidates.find(
    (option) => option.action === action,
  );
  if (candidate === undefined) {
    throw new Error(`no ${action} candidate in the pending decision`);
  }
  return candidate;
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

  test("a proposal sets the hand preview for the suggested cards", async () => {
    const { result } = renderAutopilot({
      executor: makeExecutor(),
      ranker: playFirstRanker,
    });
    await waitForProposal(result);
    expect(useGame.getState().selectedHand).not.toBeNull();
  });

  test("a manual card toggle while a proposal is pending dismisses it", async () => {
    const { result } = renderAutopilot({
      executor: makeExecutor(),
      ranker: playFirstRanker,
    });
    await waitForProposal(result);
    const proposal = result.current.pendingProposal;
    const toggled = pairHand().find((c) => c.id === proposal?.cardIds[0]);
    if (!toggled) throw new Error("expected a proposed card to toggle");
    act(() => useGame.getState().toggleCard(toggled));
    await waitFor(() => expect(result.current.pendingProposal).toBeNull());
  });

  test("a manual card toggle while a proposal is pending calls onStop", async () => {
    const onStop = vi.fn();
    const { result } = renderAutopilot({
      executor: makeExecutor(),
      ranker: playFirstRanker,
      onStop,
    });
    await waitForProposal(result);
    const proposal = result.current.pendingProposal;
    const toggled = pairHand().find((c) => c.id === proposal?.cardIds[0]);
    if (!toggled) throw new Error("expected a proposed card to toggle");
    act(() => useGame.getState().toggleCard(toggled));
    await waitFor(() => expect(onStop).toHaveBeenCalledTimes(1));
  });

  test("a manual toggle without a pending proposal does not call onStop (negative)", () => {
    const onStop = vi.fn();
    renderAutopilot({
      enabled: false,
      executor: makeExecutor(),
      ranker: playFirstRanker,
      onStop,
    });
    act(() => useGame.getState().toggleCard(pairHand()[0]));
    expect(onStop).not.toHaveBeenCalled();
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

  test("approve closes suggest mode by calling onStop", async () => {
    const onStop = vi.fn();
    const { result } = renderAutopilot({
      executor: makeExecutor(),
      ranker: playFirstRanker,
      onStop,
    });
    await waitForProposal(result);
    act(() => result.current.approve());
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  test("approve clears the pending proposal", async () => {
    const { result } = renderAutopilot({
      executor: makeExecutor(),
      ranker: playFirstRanker,
    });
    await waitForProposal(result);
    act(() => result.current.approve());
    expect(result.current.pendingProposal).toBeNull();
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

  test("approveOption plays a supplied play candidate", async () => {
    const executor = makeExecutor();
    const { result } = renderAutopilot({ executor, ranker: playFirstRanker });
    await waitForProposal(result);
    const candidate = requireCandidate(result, "play");
    act(() => result.current.approveOption(candidate));
    expect(executor.play).toHaveBeenCalledTimes(1);
  });

  test("approveOption discards a supplied discard candidate", async () => {
    const executor = makeExecutor();
    const { result } = renderAutopilot({ executor, ranker: discardFirstRanker });
    await waitForProposal(result);
    const candidate = requireCandidate(result, "discard");
    act(() => result.current.approveOption(candidate));
    expect(executor.discard).toHaveBeenCalledTimes(1);
  });

  test("approveOption selects the supplied candidate's cards", async () => {
    const executor = makeExecutor();
    const { result } = renderAutopilot({ executor, ranker: playFirstRanker });
    await waitForProposal(result);
    const candidate = requireCandidate(result, "play");
    act(() => result.current.approveOption(candidate));
    expect(useGame.getState().selectedIds).toEqual(new Set(candidate.cardIds));
  });

  test("approveOption clears the pending proposal", async () => {
    const executor = makeExecutor();
    const { result } = renderAutopilot({ executor, ranker: playFirstRanker });
    await waitForProposal(result);
    const candidate = requireCandidate(result, "play");
    act(() => result.current.approveOption(candidate));
    expect(result.current.pendingProposal).toBeNull();
  });

  test("approveOption closes suggest mode by calling onStop", async () => {
    const onStop = vi.fn();
    const { result } = renderAutopilot({
      executor: makeExecutor(),
      ranker: playFirstRanker,
      onStop,
    });
    await waitForProposal(result);
    const candidate = requireCandidate(result, "play");
    act(() => result.current.approveOption(candidate));
    expect(onStop).toHaveBeenCalledTimes(1);
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

  test("exposes model download progress while loading", async () => {
    const ranker: CandidateRanker = {
      load: async (onProgress) => {
        onProgress?.({ loaded: 64, total: 128 });
        return new Promise<void>(() => {});
      },
      rank: playFirstRanker.rank,
    };
    const { result } = renderAutopilot({ executor: makeExecutor(), ranker });
    await waitFor(() =>
      expect(result.current.modelProgress).toEqual({ loaded: 64, total: 128 }),
    );
  });

  test("does not propose while the model is still downloading", async () => {
    const ranker: CandidateRanker = {
      load: () => new Promise<void>(() => {}),
      rank: playFirstRanker.rank,
    };
    const { result } = renderAutopilot({ executor: makeExecutor(), ranker });
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(result.current.pendingProposal).toBeNull();
  });

  test("clears model progress once a proposal is ready", async () => {
    const { result } = renderAutopilot({
      executor: makeExecutor(),
      ranker: playFirstRanker,
    });
    await waitForProposal(result);
    expect(result.current.modelProgress).toBeNull();
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

  test("setProposal replaces the pending proposal with the given move", () => {
    const { result } = renderAutopilot({
      executor: makeExecutor(),
      ranker: playFirstRanker,
    });
    const replacement = {
      action: "discard" as const,
      cardIds: [3, 4],
      notes: [],
    };
    act(() => result.current.setProposal(replacement));
    expect(result.current.pendingProposal).toBe(replacement);
  });

  test("setProposal selects the move's cards", () => {
    const { result } = renderAutopilot({
      executor: makeExecutor(),
      ranker: playFirstRanker,
    });
    act(() =>
      result.current.setProposal({
        action: "discard",
        cardIds: [3, 4],
        notes: [],
      }),
    );
    expect(useGame.getState().selectedIds).toEqual(new Set([3, 4]));
  });
});

describe("useAutopilot with face-down cards", () => {
  test("reports the proposal as unavailable when the whole hand is face-down", async () => {
    useGame.getState().setDealt({
      hand: pairHand().map((card) => ({ ...card, faceDown: true })),
      remaining: [],
    });
    const { result } = renderAutopilot({
      executor: makeExecutor(),
      ranker: playFirstRanker,
    });
    await waitFor(() => expect(result.current.proposalUnavailable).toBe(true));
  });

  test("a proposal from visible cards clears the unavailable flag", async () => {
    const { result } = renderAutopilot({
      executor: makeExecutor(),
      ranker: playFirstRanker,
    });
    await waitForProposal(result);
    expect(result.current.proposalUnavailable).toBe(false);
  });

  test("never proposes a play that uses a face-down card", async () => {
    useGame.getState().setDealt({
      hand: pairHand().map((card) =>
        card.id === 1 ? { ...card, faceDown: true } : card,
      ),
      remaining: [],
    });
    const { result } = renderAutopilot({
      executor: makeExecutor(),
      ranker: playFirstRanker,
    });
    await waitForProposal(result);
    expect(result.current.pendingProposal?.cardIds).not.toContain(1);
  });
});
