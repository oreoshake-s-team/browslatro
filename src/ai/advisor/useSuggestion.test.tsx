import { act, renderHook } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import type { Advice } from "./advice";
import type { AdviceClientResult } from "./client";
import { shopAdviceRequestFixture } from "./test-helpers";
import { useSuggestion, type SuggestionPlan } from "./useSuggestion";

type TestAction = { readonly kind: string };

function adviceFixture(): Advice {
  return {
    recommendationIndex: 0,
    alternativeIndex: 2,
    whyAlternativeWorse: "Leaving banks nothing this ante.",
    explanation: "Jolly Joker is cheap and scales every pair hand.",
    concept: "Buy engine pieces early.",
  };
}

function planFixture(): SuggestionPlan<TestAction> {
  return {
    request: shopAdviceRequestFixture(),
    actions: [{ kind: "buy" }, { kind: "reroll" }, { kind: "leave" }],
  };
}

function fetchResolving(result: AdviceClientResult) {
  return vi.fn().mockResolvedValue(result);
}

describe("useSuggestion", () => {
  test("starts idle", () => {
    const { result } = renderHook(() =>
      useSuggestion(planFixture, {
        fetchAdviceFn: fetchResolving({ ok: true, advice: adviceFixture() }),
      }),
    );
    expect(result.current.state).toEqual({ phase: "idle" });
  });

  test("resolves to ready with the advice and plan actions", async () => {
    const { result } = renderHook(() =>
      useSuggestion(planFixture, {
        fetchAdviceFn: fetchResolving({ ok: true, advice: adviceFixture() }),
      }),
    );
    await act(() => result.current.suggest());
    expect(result.current.state).toEqual({
      phase: "ready",
      advice: adviceFixture(),
      onnxIndex: null,
      candidates: shopAdviceRequestFixture().candidates,
      actions: planFixture().actions,
    });
  });

  test("posts the plan request to the advice client", async () => {
    const fetchAdviceFn = fetchResolving({ ok: true, advice: adviceFixture() });
    const { result } = renderHook(() =>
      useSuggestion(planFixture, { fetchAdviceFn }),
    );
    await act(() => result.current.suggest());
    expect(fetchAdviceFn).toHaveBeenCalledWith(shopAdviceRequestFixture());
  });

  test("does nothing when the plan builder returns null", async () => {
    const fetchAdviceFn = fetchResolving({ ok: true, advice: adviceFixture() });
    const { result } = renderHook(() =>
      useSuggestion((): SuggestionPlan<TestAction> | null => null, {
        fetchAdviceFn,
      }),
    );
    await act(() => result.current.suggest());
    expect(result.current.state).toEqual({ phase: "idle" });
  });

  test("surfaces client errors with the retry-after hint", async () => {
    const { result } = renderHook(() =>
      useSuggestion(planFixture, {
        fetchAdviceFn: fetchResolving({
          ok: false,
          code: "rate_limited",
          retryAfterSeconds: 120,
        }),
      }),
    );
    await act(() => result.current.suggest());
    expect(result.current.state).toEqual({
      phase: "error",
      code: "rate_limited",
      retryAfterSeconds: 120,
      onnxIndex: null,
      candidates: shopAdviceRequestFixture().candidates,
      actions: planFixture().actions,
    });
  });

  test("reset returns to idle", async () => {
    const { result } = renderHook(() =>
      useSuggestion(planFixture, {
        fetchAdviceFn: fetchResolving({ ok: true, advice: adviceFixture() }),
      }),
    );
    await act(() => result.current.suggest());
    act(() => result.current.reset());
    expect(result.current.state).toEqual({ phase: "idle" });
  });

  test("loading state carries candidates and actions with null onnxIndex", async () => {
    let release: (value: AdviceClientResult) => void = () => undefined;
    const pending = new Promise<AdviceClientResult>((resolve) => {
      release = resolve;
    });
    const { result } = renderHook(() =>
      useSuggestion(planFixture, { fetchAdviceFn: vi.fn().mockReturnValue(pending) }),
    );
    act(() => {
      void result.current.suggest();
    });
    expect(result.current.state).toEqual({
      phase: "loading",
      onnxIndex: null,
      candidates: shopAdviceRequestFixture().candidates,
      actions: planFixture().actions,
    });
    release({ ok: false, code: "rate_limited" });
  });

  test("preRank updates onnxIndex while still loading", async () => {
    let release: (value: AdviceClientResult) => void = () => undefined;
    const pending = new Promise<AdviceClientResult>((resolve) => {
      release = resolve;
    });
    const preRank = vi.fn().mockResolvedValue(1);
    const { result } = renderHook(() =>
      useSuggestion(planFixture, { fetchAdviceFn: vi.fn().mockReturnValue(pending) }, preRank),
    );
    await act(async () => {
      void result.current.suggest();
      await Promise.resolve();
    });
    expect(result.current.state).toMatchObject({ phase: "loading", onnxIndex: 1 });
    release({ ok: false, code: "rate_limited" });
  });

  test("LLM ready result overrides preRank onnxIndex", async () => {
    const preRank = vi.fn().mockResolvedValue(2);
    const { result } = renderHook(() =>
      useSuggestion(planFixture, {
        fetchAdviceFn: fetchResolving({ ok: true, advice: adviceFixture() }),
      }, preRank),
    );
    await act(() => result.current.suggest());
    expect(result.current.state.phase).toBe("ready");
  });

  test("coach resolves to the coach phase with the preRank onnxIndex", async () => {
    const preRank = vi.fn().mockResolvedValue(1);
    const { result } = renderHook(() =>
      useSuggestion(planFixture, {
        fetchAdviceFn: fetchResolving({ ok: true, advice: adviceFixture() }),
      }, preRank),
    );
    await act(() => result.current.coach());
    expect(result.current.state).toMatchObject({ phase: "coach", onnxIndex: 1 });
  });

  test("coach never calls the advice client", async () => {
    const fetchAdviceFn = fetchResolving({ ok: true, advice: adviceFixture() });
    const preRank = vi.fn().mockResolvedValue(0);
    const { result } = renderHook(() =>
      useSuggestion(planFixture, { fetchAdviceFn }, preRank),
    );
    await act(() => result.current.coach());
    expect(fetchAdviceFn).not.toHaveBeenCalled();
  });

  test("coach leaves onnxIndex null when no preRank is provided", async () => {
    const { result } = renderHook(() =>
      useSuggestion(planFixture, {
        fetchAdviceFn: fetchResolving({ ok: true, advice: adviceFixture() }),
      }),
    );
    await act(() => result.current.coach());
    expect(result.current.state).toMatchObject({ phase: "coach", onnxIndex: null });
  });

  test("askAi resolves to ready while preserving the coach onnxIndex", async () => {
    const preRank = vi.fn().mockResolvedValue(2);
    const { result } = renderHook(() =>
      useSuggestion(planFixture, {
        fetchAdviceFn: fetchResolving({ ok: true, advice: adviceFixture() }),
      }, preRank),
    );
    await act(() => result.current.coach());
    await act(() => result.current.askAi());
    expect(result.current.state).toMatchObject({ phase: "ready", onnxIndex: 2 });
  });

  test("askAi surfaces client errors while keeping the coach onnxIndex", async () => {
    const preRank = vi.fn().mockResolvedValue(2);
    const { result } = renderHook(() =>
      useSuggestion(planFixture, {
        fetchAdviceFn: fetchResolving({ ok: false, code: "model_error" }),
      }, preRank),
    );
    await act(() => result.current.coach());
    await act(() => result.current.askAi());
    expect(result.current.state).toMatchObject({ phase: "error", onnxIndex: 2 });
  });

  test("a reset during flight discards the late response", async () => {
    let release: (value: AdviceClientResult) => void = () => undefined;
    const pending = new Promise<AdviceClientResult>((resolve) => {
      release = resolve;
    });
    const { result } = renderHook(() =>
      useSuggestion(planFixture, {
        fetchAdviceFn: vi.fn().mockReturnValue(pending),
      }),
    );
    let inFlight: Promise<void> = Promise.resolve();
    act(() => {
      inFlight = result.current.suggest();
    });
    act(() => result.current.reset());
    await act(async () => {
      release({ ok: true, advice: adviceFixture() });
      await inFlight;
    });
    expect(result.current.state).toEqual({ phase: "idle" });
  });
});
