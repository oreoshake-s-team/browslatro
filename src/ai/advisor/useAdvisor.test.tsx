import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Card } from "../../cards/types";
import { useGame } from "../../store/game";
import type { CandidateRanker } from "../policy";
import type { Advice } from "./advice";
import type { AdvisorDeps } from "./useAdvisor";
import { useAdvisor } from "./useAdvisor";

function pairHand(): Card[] {
  return [
    { id: 1, rank: "9", suit: "hearts" },
    { id: 2, rank: "9", suit: "spades" },
    { id: 3, rank: "K", suit: "clubs" },
    { id: 4, rank: "4", suit: "diamonds" },
    { id: 5, rank: "7", suit: "hearts" },
  ];
}

function adviceFixture(): Advice {
  return {
    recommendationIndex: 0,
    alternativeIndex: 1,
    whyAlternativeWorse: "Discarding wastes a strong pair.",
    explanation: "Play the pair of nines.",
    concept: "Bank guaranteed score.",
  };
}

const passthroughRanker: CandidateRanker = {
  rank: async (_state, candidates) => candidates.map((_, index) => index),
};

function makeDeps(extra?: Partial<AdvisorDeps>): AdvisorDeps {
  return {
    ranker: passthroughRanker,
    fetchAdviceFn: vi.fn().mockResolvedValue({ ok: true, advice: adviceFixture() }),
    getState: () => useGame.getState(),
    ...extra,
  };
}

beforeEach(() => {
  useGame.getState().resetGame();
});

function dealPairHand(): void {
  useGame.getState().setDealt({ hand: pairHand(), remaining: [] });
}

describe("useAdvisor", () => {
  test("starts idle", () => {
    const { result } = renderHook(() => useAdvisor(makeDeps()));
    expect(result.current.state).toEqual({ phase: "idle" });
  });

  test("degrades with no_candidates when the hand is empty", async () => {
    const { result } = renderHook(() => useAdvisor(makeDeps()));
    await act(() => result.current.requestAdvice());
    expect(result.current.state).toEqual({
      phase: "degraded",
      topCandidate: null,
      code: "no_candidates",
    });
  });

  test("reaches ready with the model's advice on success", async () => {
    dealPairHand();
    const { result } = renderHook(() => useAdvisor(makeDeps()));
    await act(() => result.current.requestAdvice());
    const state = result.current.state;
    expect(state.phase === "ready" && state.report.advice).toEqual(adviceFixture());
  });

  test("sends candidates to the API in the ranker's order", async () => {
    dealPairHand();
    const reversingRanker: CandidateRanker = {
      rank: async (_state, candidates) =>
        candidates.map((_, index) => index).reverse(),
    };
    const fetchAdviceFn = vi
      .fn()
      .mockResolvedValue({ ok: true, advice: adviceFixture() });
    const { result } = renderHook(() =>
      useAdvisor(makeDeps({ ranker: reversingRanker, fetchAdviceFn })),
    );
    await act(() => result.current.requestAdvice());
    const readyState = result.current.state;
    const sent = fetchAdviceFn.mock.calls[0][1];
    expect(
      readyState.phase === "ready" && readyState.report.candidates,
    ).toEqual(sent);
  });

  test("skips the API entirely when explanation is not requested", async () => {
    dealPairHand();
    const fetchAdviceFn = vi
      .fn()
      .mockResolvedValue({ ok: true, advice: adviceFixture() });
    const { result } = renderHook(() => useAdvisor(makeDeps({ fetchAdviceFn })));
    await act(() => result.current.requestAdvice({ explain: false }));
    expect(fetchAdviceFn).not.toHaveBeenCalled();
  });

  test("reaches move-only with the top-ranked candidate when explanation is not requested", async () => {
    dealPairHand();
    const { result } = renderHook(() => useAdvisor(makeDeps()));
    await act(() => result.current.requestAdvice({ explain: false }));
    const state = result.current.state;
    expect(state.phase === "move-only" && state.topCandidate).not.toBeNull();
  });

  test("degrades to the top-ranked candidate when the fetch fails", async () => {
    dealPairHand();
    const fetchAdviceFn = vi
      .fn()
      .mockResolvedValue({ ok: false, code: "model_timeout" });
    const { result } = renderHook(() => useAdvisor(makeDeps({ fetchAdviceFn })));
    await act(() => result.current.requestAdvice());
    const state = result.current.state;
    expect(state.phase === "degraded" && state.code).toBe("model_timeout");
  });

  test("the degraded fallback carries a concrete candidate", async () => {
    dealPairHand();
    const fetchAdviceFn = vi
      .fn()
      .mockResolvedValue({ ok: false, code: "advisor_busy" });
    const { result } = renderHook(() => useAdvisor(makeDeps({ fetchAdviceFn })));
    await act(() => result.current.requestAdvice());
    const state = result.current.state;
    expect(state.phase === "degraded" && state.topCandidate).not.toBeNull();
  });

  test("shows loading while the request is in flight", async () => {
    dealPairHand();
    let release: (value: { ok: true; advice: Advice }) => void = () => {};
    const fetchAdviceFn = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const { result } = renderHook(() => useAdvisor(makeDeps({ fetchAdviceFn })));
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.requestAdvice();
    });
    expect(result.current.state).toEqual({ phase: "loading" });
    await act(async () => {
      release({ ok: true, advice: adviceFixture() });
      await pending;
    });
  });

  test("reset returns to idle and ignores the stale in-flight result", async () => {
    dealPairHand();
    let release: (value: { ok: true; advice: Advice }) => void = () => {};
    const fetchAdviceFn = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const { result } = renderHook(() => useAdvisor(makeDeps({ fetchAdviceFn })));
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.requestAdvice();
    });
    act(() => {
      result.current.reset();
    });
    await act(async () => {
      release({ ok: true, advice: adviceFixture() });
      await pending;
    });
    expect(result.current.state).toEqual({ phase: "idle" });
  });
});
