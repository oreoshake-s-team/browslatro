import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Card } from "../../cards/types";
import { useGame } from "../../store/game";
import type { CandidateRanker } from "../policy";
import type { Advice } from "./advice";
import type { AdvisorDeps } from "./useAdvisor";
import { clearAdvisorAdviceCache, useAdvisor } from "./useAdvisor";

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
  load: async () => {},
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
  clearAdvisorAdviceCache();
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
      load: async () => {},
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


  test("reuses the cached advice while the hand is unchanged", async () => {
    dealPairHand();
    const fetchAdviceFn = vi
      .fn()
      .mockResolvedValue({ ok: true, advice: adviceFixture() });
    const { result } = renderHook(() => useAdvisor(makeDeps({ fetchAdviceFn })));
    await act(() => result.current.requestAdvice());
    await act(() => result.current.requestAdvice());
    expect(fetchAdviceFn).toHaveBeenCalledTimes(1);
  });

  test("serves cached advice when flipping from just-the-move back to the walkthrough", async () => {
    dealPairHand();
    const fetchAdviceFn = vi
      .fn()
      .mockResolvedValue({ ok: true, advice: adviceFixture() });
    const { result } = renderHook(() => useAdvisor(makeDeps({ fetchAdviceFn })));
    await act(() => result.current.requestAdvice());
    await act(() => result.current.requestAdvice({ explain: false }));
    await act(() => result.current.requestAdvice());
    const state = result.current.state;
    expect(fetchAdviceFn).toHaveBeenCalledTimes(1);
    expect(state.phase === "ready" && state.report.advice).toEqual(adviceFixture());
  });

  test("refetches once the hand changes", async () => {
    dealPairHand();
    const fetchAdviceFn = vi
      .fn()
      .mockResolvedValue({ ok: true, advice: adviceFixture() });
    const { result } = renderHook(() => useAdvisor(makeDeps({ fetchAdviceFn })));
    await act(() => result.current.requestAdvice());
    useGame.getState().setDealt({
      hand: [
        { id: 7, rank: "A", suit: "clubs" },
        { id: 8, rank: "A", suit: "spades" },
        { id: 9, rank: "2", suit: "hearts" },
      ],
      remaining: [],
    });
    await act(() => result.current.requestAdvice());
    expect(fetchAdviceFn).toHaveBeenCalledTimes(2);
  });

  test("a failed fetch is not cached", async () => {
    dealPairHand();
    const fetchAdviceFn = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, code: "model_timeout" })
      .mockResolvedValue({ ok: true, advice: adviceFixture() });
    const { result } = renderHook(() => useAdvisor(makeDeps({ fetchAdviceFn })));
    await act(() => result.current.requestAdvice());
    await act(() => result.current.requestAdvice());
    expect(fetchAdviceFn).toHaveBeenCalledTimes(2);
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

  test("enters the model-loading step with zero progress before the model resolves", async () => {
    dealPairHand();
    const ranker: CandidateRanker = {
      load: () => new Promise<void>(() => {}),
      rank: passthroughRanker.rank,
    };
    const { result } = renderHook(() => useAdvisor(makeDeps({ ranker })));
    act(() => {
      void result.current.requestAdvice();
    });
    expect(result.current.state).toEqual({
      phase: "loading-model",
      progress: { loaded: 0, total: null },
    });
  });

  test("forwards download progress into the loading-model phase", async () => {
    dealPairHand();
    const ranker: CandidateRanker = {
      load: async (onProgress) => {
        onProgress?.({ loaded: 120, total: 200 });
        return new Promise<void>(() => {});
      },
      rank: passthroughRanker.rank,
    };
    const { result } = renderHook(() => useAdvisor(makeDeps({ ranker })));
    await act(async () => {
      void result.current.requestAdvice();
    });
    expect(result.current.state).toEqual({
      phase: "loading-model",
      progress: { loaded: 120, total: 200 },
    });
  });

  test("enters the querying step while the API call is in flight", async () => {
    dealPairHand();
    let release: (value: { ok: true; advice: Advice }) => void = () => {};
    const fetchAdviceFn = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const { result } = renderHook(() => useAdvisor(makeDeps({ fetchAdviceFn })));
    let pending: Promise<void> = Promise.resolve();
    await act(async () => {
      pending = result.current.requestAdvice();
    });
    expect(result.current.state).toEqual({ phase: "querying" });
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
