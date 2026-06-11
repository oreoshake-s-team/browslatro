import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { getHandOptions, type HandOption } from "../getHandOptions";
import type { Card } from "../../cards/types";
import { useGame } from "../../store/game";
import type { Advice } from "./advice";
import { toSimulatePlayInput } from "./snapshot";
import type { MoveExplanationDeps } from "./useMoveExplanation";
import { useMoveExplanation } from "./useMoveExplanation";

function pairHand(): Card[] {
  return [
    { id: 1, rank: "9", suit: "hearts" },
    { id: 2, rank: "9", suit: "spades" },
    { id: 3, rank: "K", suit: "clubs" },
    { id: 4, rank: "4", suit: "diamonds" },
    { id: 5, rank: "7", suit: "hearts" },
  ];
}

function dealPairHand(): void {
  useGame.getState().setDealt({ hand: pairHand(), remaining: [] });
}

function currentCandidates(): ReadonlyArray<HandOption> {
  return getHandOptions(toSimulatePlayInput(useGame.getState()));
}

function proposal(): HandOption {
  return {
    action: "play",
    cardIds: [1, 2],
    handLabel: "Pair",
    score: 40,
    chips: 20,
    mult: 2,
    notes: [],
  };
}

function adviceFixture(): Advice {
  return {
    recommendationIndex: 0,
    alternativeIndex: 0,
    whyAlternativeWorse: "No other option here.",
    explanation: "Play the pair to bank guaranteed chips.",
    concept: "Lock in value before chasing draws.",
  };
}

function makeDeps(extra?: Partial<MoveExplanationDeps>): MoveExplanationDeps {
  return {
    fetchAdviceFn: vi.fn().mockResolvedValue({ ok: true, advice: adviceFixture() }),
    getState: () => useGame.getState(),
    ...extra,
  };
}

beforeEach(() => {
  useGame.getState().resetGame();
});

describe("useMoveExplanation", () => {
  test("starts idle", () => {
    const { result } = renderHook(() => useMoveExplanation(makeDeps()));
    expect(result.current.state).toEqual({ phase: "idle" });
  });

  test("sends the proposal as the only candidate", async () => {
    const fetchAdviceFn = vi
      .fn()
      .mockResolvedValue({ ok: true, advice: adviceFixture() });
    const { result } = renderHook(() =>
      useMoveExplanation(makeDeps({ fetchAdviceFn })),
    );
    await act(() => result.current.explain(proposal()));
    expect(fetchAdviceFn.mock.calls[0][1]).toEqual([proposal()]);
  });

  test("reaches ready with the explanation on success", async () => {
    const { result } = renderHook(() => useMoveExplanation(makeDeps()));
    await act(() => result.current.explain(proposal()));
    const state = result.current.state;
    expect(state.phase === "ready" && state.advice.explanation).toBe(
      "Play the pair to bank guaranteed chips.",
    );
  });

  test("reaches ready carrying the transferable concept", async () => {
    const { result } = renderHook(() => useMoveExplanation(makeDeps()));
    await act(() => result.current.explain(proposal()));
    const state = result.current.state;
    expect(state.phase === "ready" && state.advice.concept).toBe(
      "Lock in value before chasing draws.",
    );
  });

  test("reaches error with the client code on failure", async () => {
    const fetchAdviceFn = vi
      .fn()
      .mockResolvedValue({ ok: false, code: "model_timeout" });
    const { result } = renderHook(() =>
      useMoveExplanation(makeDeps({ fetchAdviceFn })),
    );
    await act(() => result.current.explain(proposal()));
    const state = result.current.state;
    expect(state.phase === "error" && state.code).toBe("model_timeout");
  });

  test("carries the retry-after seconds on a rate-limited error", async () => {
    const fetchAdviceFn = vi
      .fn()
      .mockResolvedValue({ ok: false, code: "rate_limited", retryAfterSeconds: 90 });
    const { result } = renderHook(() =>
      useMoveExplanation(makeDeps({ fetchAdviceFn })),
    );
    await act(() => result.current.explain(proposal()));
    const state = result.current.state;
    expect(state.phase === "error" && state.retryAfterSeconds).toBe(90);
  });

  test("shows loading while the request is in flight", async () => {
    let release: (value: { ok: true; advice: Advice }) => void = () => {};
    const fetchAdviceFn = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const { result } = renderHook(() =>
      useMoveExplanation(makeDeps({ fetchAdviceFn })),
    );
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.explain(proposal());
    });
    expect(result.current.state).toEqual({ phase: "loading" });
    await act(async () => {
      release({ ok: true, advice: adviceFixture() });
      await pending;
    });
  });

  test("reset returns to idle", async () => {
    const { result } = renderHook(() => useMoveExplanation(makeDeps()));
    await act(() => result.current.explain(proposal()));
    act(() => result.current.reset());
    expect(result.current.state).toEqual({ phase: "idle" });
  });

  test("reset ignores a stale in-flight result", async () => {
    let release: (value: { ok: true; advice: Advice }) => void = () => {};
    const fetchAdviceFn = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const { result } = renderHook(() =>
      useMoveExplanation(makeDeps({ fetchAdviceFn })),
    );
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.explain(proposal());
    });
    act(() => result.current.reset());
    await act(async () => {
      release({ ok: true, advice: adviceFixture() });
      await pending;
    });
    expect(result.current.state).toEqual({ phase: "idle" });
  });

  test("suggestMove returns the candidate at the recommended index", async () => {
    dealPairHand();
    const expected = currentCandidates()[1];
    const fetchAdviceFn = vi.fn().mockResolvedValue({
      ok: true,
      advice: { ...adviceFixture(), recommendationIndex: 1, alternativeIndex: 0 },
    });
    const { result } = renderHook(() =>
      useMoveExplanation(makeDeps({ fetchAdviceFn })),
    );
    let picked: HandOption | null = proposal();
    await act(async () => {
      picked = await result.current.suggestMove();
    });
    expect(picked?.cardIds).toEqual(expected.cardIds);
  });

  test("suggestMove sends every candidate to the advice endpoint", async () => {
    dealPairHand();
    const expectedCount = currentCandidates().length;
    const fetchAdviceFn = vi
      .fn()
      .mockResolvedValue({ ok: true, advice: adviceFixture() });
    const { result } = renderHook(() =>
      useMoveExplanation(makeDeps({ fetchAdviceFn })),
    );
    await act(() => result.current.suggestMove());
    expect(fetchAdviceFn.mock.calls[0][1]).toHaveLength(expectedCount);
  });

  test("suggestMove leaves the coach reasoning in the ready state", async () => {
    dealPairHand();
    const { result } = renderHook(() => useMoveExplanation(makeDeps()));
    await act(() => result.current.suggestMove());
    const state = result.current.state;
    expect(state.phase === "ready" && state.advice.explanation).toBe(
      "Play the pair to bank guaranteed chips.",
    );
  });

  test("suggestMove returns null when there are no candidates", async () => {
    const { result } = renderHook(() => useMoveExplanation(makeDeps()));
    let picked: HandOption | null = proposal();
    await act(async () => {
      picked = await result.current.suggestMove();
    });
    expect(picked).toBeNull();
  });

  test("suggestMove surfaces the error code on failure", async () => {
    dealPairHand();
    const fetchAdviceFn = vi
      .fn()
      .mockResolvedValue({ ok: false, code: "rate_limited", retryAfterSeconds: 30 });
    const { result } = renderHook(() =>
      useMoveExplanation(makeDeps({ fetchAdviceFn })),
    );
    await act(() => result.current.suggestMove());
    const state = result.current.state;
    expect(state.phase === "error" && state.code).toBe("rate_limited");
  });
});
