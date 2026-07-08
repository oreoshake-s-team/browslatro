import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import type { ReactNode } from "react";
import { useGame } from "../../store/game";
import GameSessionProvider from "./GameSessionProvider";
import AutopilotSessionProvider from "./AutopilotSessionProvider";
import { useAutopilotSession } from "./autopilotSession";

function wrapper({ children }: { children: ReactNode }) {
  return (
    <GameSessionProvider>
      <AutopilotSessionProvider>{children}</AutopilotSessionProvider>
    </GameSessionProvider>
  );
}

beforeEach(() => {
  useGame.getState().resetGame();
});

describe("AutopilotSessionProvider", () => {
  test("useAutopilotSession is null without a provider", () => {
    const { result } = renderHook(() => useAutopilotSession());
    expect(result.current).toBeNull();
  });

  test("exposes a disabled controller on mount", () => {
    const { result } = renderHook(() => useAutopilotSession(), { wrapper });
    expect(result.current?.enabled).toBe(false);
  });

  test("onToggle enables the autopilot", () => {
    const { result } = renderHook(() => useAutopilotSession(), { wrapper });
    act(() => result.current?.onToggle());
    expect(result.current?.enabled).toBe(true);
  });
});
