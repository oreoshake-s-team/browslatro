import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach } from "vitest";
import Game from "./Game";
import { useGame } from "../../store/game";

function renderGame(overrides: Partial<ComponentProps<typeof Game>> = {}) {
  return render(
    <Game
      onSubmitHand={vi.fn()}
      onDiscard={vi.fn()}
      canDiscard={true}
      onCardDiscardEnd={vi.fn()}
      {...overrides}
    />,
  );
}

describe("Game", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("Submit Hand button calls onSubmitHand", async () => {
    const user = userEvent.setup();
    const onSubmitHand = vi.fn();
    renderGame({ onSubmitHand });
    await user.click(screen.getByText(/Submit Hand/));
    expect(onSubmitHand).toHaveBeenCalledTimes(1);
  });

  test("renders the player's hand of cards", () => {
    renderGame();
    expect(screen.getByLabelText("Your hand")).toBeInTheDocument();
  });

  test("Discard button calls onDiscard when enabled", async () => {
    const user = userEvent.setup();
    const onDiscard = vi.fn();
    renderGame({ onDiscard, canDiscard: true });
    await user.click(screen.getByText(/Discard/));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  test("Discard button is disabled when canDiscard is false", () => {
    renderGame({ canDiscard: false });
    expect(screen.getByText(/Discard/)).toBeDisabled();
  });

  test("Discard button is enabled when canDiscard is true", () => {
    renderGame({ canDiscard: true });
    expect(screen.getByText(/Discard/)).not.toBeDisabled();
  });

  test("the modifier disclosure is closed on first render", () => {
    renderGame();
    expect(screen.getByText(/Apply modifiers/).closest("details")).not.toHaveAttribute(
      "open",
    );
  });

  test("clicking the modifier disclosure opens it", async () => {
    const user = userEvent.setup();
    renderGame();
    await user.click(screen.getByText(/Apply modifiers/));
    expect(screen.getByText(/Apply modifiers/).closest("details")).toHaveAttribute(
      "open",
    );
  });

  test("does not render a Current hand readout (negative)", () => {
    renderGame();
    expect(screen.queryByText(/Current hand/i)).not.toBeInTheDocument();
  });

  test("does not render a Play or discard step label (negative)", () => {
    renderGame();
    expect(screen.queryByText(/Play or discard/i)).not.toBeInTheDocument();
  });
});
