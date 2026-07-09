import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "../../store/game";
import GameSessionProvider from "./GameSessionProvider";
import AppOverlays from "./AppOverlays";

function renderOverlays() {
  return render(
    <GameSessionProvider>
      <AppOverlays />
    </GameSessionProvider>,
  );
}

beforeEach(() => {
  useGame.getState().resetGame();
});

describe("AppOverlays", () => {
  test("renders nothing when no overlay is pending", () => {
    useGame.getState().setPendingRunSelect(false);
    useGame.getState().setPendingBlindSelect(false);
    const { container } = renderOverlays();
    expect(container).toBeEmptyDOMElement();
  });

  test("shows the run-select screen when a run selection is pending", () => {
    useGame.getState().setPendingRunSelect(true);
    renderOverlays();
    expect(screen.getByTestId("new-run-preview-hands")).toBeInTheDocument();
  });

  test("shows the blind-select screen when only a blind selection is pending", async () => {
    useGame.getState().setPendingRunSelect(false);
    useGame.getState().setPendingBlindSelect(true);
    renderOverlays();
    expect(await screen.findByTestId("blind-select-play")).toBeInTheDocument();
  });

  test("suppresses the blind-select screen while run selection is pending", () => {
    useGame.getState().setPendingRunSelect(true);
    useGame.getState().setPendingBlindSelect(true);
    renderOverlays();
    expect(screen.queryByTestId("blind-select-play")).not.toBeInTheDocument();
  });
});
