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

  test("Submit Hand renders before Apply modifiers in DOM order (closes #634)", () => {
    renderGame();
    const submit = screen.getByText(/Submit Hand/);
    const modifiers = screen.getByText(/Apply modifiers/);
    const position = submit.compareDocumentPosition(modifiers);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });
});

describe("Submit Hand button — inline current hand readout (#745)", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("does not render the inline readout when no hand is selected (negative)", () => {
    renderGame();
    expect(screen.queryByTestId("submit-hand-detected")).not.toBeInTheDocument();
  });

  test("renders the inline readout with the hand label when a hand is selected", () => {
    useGame.getState().setSelectedHand({ label: "Pair", chips: 10, multiplier: 2 });
    useGame.getState().setChips(10);
    useGame.getState().setMultiplier(2);
    renderGame();
    expect(screen.getByTestId("submit-hand-detected")).toHaveTextContent(/Pair/);
  });

  test("renders the inline readout with the chips × multiplier from the store", () => {
    useGame.getState().setSelectedHand({ label: "Flush", chips: 35, multiplier: 4 });
    useGame.getState().setChips(35);
    useGame.getState().setMultiplier(4);
    renderGame();
    expect(screen.getByTestId("submit-hand-detected")).toHaveTextContent(/35.*×.*4/);
  });

  test("inline readout applies the dev chips/mult offsets so it matches the sidebar", () => {
    useGame.getState().setSelectedHand({ label: "Pair", chips: 10, multiplier: 2 });
    useGame.getState().setChips(10);
    useGame.getState().setMultiplier(2);
    useGame.getState().setDevChipsBonus(5);
    useGame.getState().setDevMultBonus(1);
    renderGame();
    expect(screen.getByTestId("submit-hand-detected")).toHaveTextContent(/15.*×.*3/);
  });

  test("Submit Hand accessible name includes the hand label when one is selected", () => {
    useGame.getState().setSelectedHand({ label: "Pair", chips: 10, multiplier: 2 });
    useGame.getState().setChips(10);
    useGame.getState().setMultiplier(2);
    renderGame();
    expect(
      screen.getByRole("button", { name: /Submit Hand: Pair/ }),
    ).toBeInTheDocument();
  });
});
