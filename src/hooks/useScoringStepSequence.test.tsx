import { renderHook, act } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useScoringStepSequence } from "./useScoringStepSequence";

const STEP_MS = 10;

interface HarnessArgs<T> {
  items: ReadonlyArray<T>;
  onStep: (item: T, index: number) => void;
  onFinish: () => void;
}

function useHarness<T>({ items, onStep, onFinish }: HarnessArgs<T>) {
  const [index, setIndex] = useState(0);
  useScoringStepSequence({ items, index, setIndex, stepMs: STEP_MS, onStep, onFinish });
  return index;
}

describe("useScoringStepSequence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("invokes onStep with the first item after one tick", () => {
    const onStep = vi.fn();
    renderHook(() =>
      useHarness({ items: ["a", "b"], onStep, onFinish: vi.fn() }),
    );
    act(() => {
      vi.advanceTimersByTime(STEP_MS);
    });
    expect(onStep).toHaveBeenCalledWith("a", 0);
  });

  test("advances the index after a step", () => {
    const { result } = renderHook(() =>
      useHarness({ items: ["a", "b"], onStep: vi.fn(), onFinish: vi.fn() }),
    );
    act(() => {
      vi.advanceTimersByTime(STEP_MS);
    });
    expect(result.current).toBe(1);
  });

  test("calls onFinish once after the final item", () => {
    const onFinish = vi.fn();
    renderHook(() =>
      useHarness({ items: ["a", "b"], onStep: vi.fn(), onFinish }),
    );
    act(() => {
      vi.advanceTimersByTime(STEP_MS);
    });
    act(() => {
      vi.advanceTimersByTime(STEP_MS);
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  test("does not step for an empty list (negative)", () => {
    const onStep = vi.fn();
    renderHook(() => useHarness({ items: [], onStep, onFinish: vi.fn() }));
    act(() => {
      vi.advanceTimersByTime(STEP_MS * 5);
    });
    expect(onStep).not.toHaveBeenCalled();
  });

  test("does not step after unmount (negative)", () => {
    const onStep = vi.fn();
    const { unmount } = renderHook(() =>
      useHarness({ items: ["a", "b"], onStep, onFinish: vi.fn() }),
    );
    unmount();
    act(() => {
      vi.advanceTimersByTime(STEP_MS);
    });
    expect(onStep).not.toHaveBeenCalled();
  });
});
