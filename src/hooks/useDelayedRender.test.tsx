import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useDelayedRender } from "./useDelayedRender";

describe("useDelayedRender", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("returns false before the default delay fires", () => {
    const { result } = renderHook(() => useDelayedRender());
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(result.current).toBe(false);
  });

  test("returns true after the default 180ms delay fires", () => {
    const { result } = renderHook(() => useDelayedRender());
    act(() => {
      vi.advanceTimersByTime(180);
    });
    expect(result.current).toBe(true);
  });

  test("honors a custom delay argument", () => {
    const { result } = renderHook(() => useDelayedRender(500));
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current).toBe(false);
  });

  test("returns true past a custom delay", () => {
    const { result } = renderHook(() => useDelayedRender(500));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe(true);
  });

  test("returns true immediately when delay is zero", () => {
    const { result } = renderHook(() => useDelayedRender(0));
    expect(result.current).toBe(true);
  });

  test("clamps negative delays to zero and returns true immediately", () => {
    const { result } = renderHook(() => useDelayedRender(-200));
    expect(result.current).toBe(true);
  });

  test("does not throw or warn when unmounted before the timer fires", () => {
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = renderHook(() => useDelayedRender(200));
    unmount();
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
