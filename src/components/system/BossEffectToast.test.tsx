import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import BossEffectToast, { showBossEffectToast } from "./BossEffectToast";

describe("BossEffectToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
  });

  test("renders nothing before any toast is shown", () => {
    render(<BossEffectToast />);
    expect(screen.queryByTestId("boss-effect-toast")).toBeNull();
  });

  test("shows the message after showBossEffectToast is called", () => {
    render(<BossEffectToast />);
    act(() => {
      showBossEffectToast("Flush scored 0");
    });
    expect(screen.getByTestId("boss-effect-toast")).toHaveTextContent(
      "Flush scored 0",
    );
  });

  test("auto-dismisses after the timeout", () => {
    render(<BossEffectToast />);
    act(() => {
      showBossEffectToast("Flush scored 0");
    });
    act(() => {
      vi.advanceTimersByTime(2600);
    });
    expect(screen.queryByTestId("boss-effect-toast")).toBeNull();
  });
});
