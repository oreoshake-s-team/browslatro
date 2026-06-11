import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useAutoHideSidebar } from "./useAutoHideSidebar";

const PORTRAIT_QUERY = "(orientation: portrait) and (max-width: 768px)";

function setPortrait(matches: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query === PORTRAIT_QUERY ? matches : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

function scrollPage(top: number): void {
  Object.defineProperty(document.body, "scrollTop", {
    configurable: true,
    value: top,
  });
  act(() => {
    document.body.dispatchEvent(new Event("scroll", { bubbles: false }));
  });
}

describe("useAutoHideSidebar", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    document.body.replaceChildren();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
    vi.restoreAllMocks();
  });

  describe("in portrait", () => {
    beforeEach(() => setPortrait(true));

    test("stays visible before any scrolling", () => {
      const { result } = renderHook(() => useAutoHideSidebar());
      expect(result.current).toBe(false);
    });

    test("hides after a deliberate downward scroll", () => {
      const { result } = renderHook(() => useAutoHideSidebar());
      scrollPage(120);
      expect(result.current).toBe(true);
    });

    test("ignores a small accidental downward scroll", () => {
      const { result } = renderHook(() => useAutoHideSidebar());
      scrollPage(24);
      expect(result.current).toBe(false);
    });

    test("reveals again when the page scrolls back up", () => {
      const { result } = renderHook(() => useAutoHideSidebar());
      scrollPage(120);
      scrollPage(60);
      expect(result.current).toBe(false);
    });

    test("reveals whenever the page returns to the top", () => {
      const { result } = renderHook(() => useAutoHideSidebar());
      scrollPage(200);
      scrollPage(0);
      expect(result.current).toBe(false);
    });

    test("ignores scrolling that originates inside a nested container", () => {
      const { result } = renderHook(() => useAutoHideSidebar());
      const inner = document.createElement("div");
      document.body.append(inner);
      Object.defineProperty(inner, "scrollTop", {
        configurable: true,
        value: 300,
      });
      act(() => {
        inner.dispatchEvent(new Event("scroll", { bubbles: false }));
      });
      expect(result.current).toBe(false);
    });
  });

  describe("outside portrait", () => {
    beforeEach(() => setPortrait(false));

    test("never hides regardless of scrolling", () => {
      const { result } = renderHook(() => useAutoHideSidebar());
      scrollPage(500);
      expect(result.current).toBe(false);
    });
  });
});
