import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ReactNode } from "react";
import { useGame } from "../../store/game";
import GameSessionProvider from "./GameSessionProvider";
import { useGameSession } from "./gameSession";

function wrapper({ children }: { children: ReactNode }) {
  return <GameSessionProvider>{children}</GameSessionProvider>;
}

beforeEach(() => {
  useGame.getState().resetGame();
});

describe("GameSessionProvider", () => {
  test("useGameSession throws when rendered without a provider", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(() => renderHook(() => useGameSession())).toThrow(
        "useGameSession must be used within GameSessionProvider",
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  test("exposes a non-scoring session on mount", () => {
    const { result } = renderHook(() => useGameSession(), { wrapper });
    expect(result.current.isScoring).toBe(false);
  });

  test("confirmBlindSelect clears the pending blind-select flag", () => {
    useGame.getState().setPendingBlindSelect(true);
    const { result } = renderHook(() => useGameSession(), { wrapper });
    act(() => result.current.confirmBlindSelect());
    expect(useGame.getState().pendingBlindSelect).toBe(false);
  });

  test("startNewGame returns the run to the run-select screen", () => {
    useGame.getState().setPendingRunSelect(false);
    const { result } = renderHook(() => useGameSession(), { wrapper });
    act(() => result.current.startNewGame());
    expect(useGame.getState().pendingRunSelect).toBe(true);
  });

  test("confirmRunSelection applies the chosen stake", () => {
    const { result } = renderHook(() => useGameSession(), { wrapper });
    act(() =>
      result.current.confirmRunSelection({ stake: "green", deck: "red-deck" }),
    );
    expect(useGame.getState().selectedStake).toBe("green");
  });
});
