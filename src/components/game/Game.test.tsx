import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import Game from "./Game";
import { HANDS } from "../../constants";

function renderGame(overrides: Partial<ComponentProps<typeof Game>> = {}) {
  return render(
    <Game
      onWin={vi.fn()}
      onAddChips={vi.fn()}
      onAddMultiplier={vi.fn()}
      onMultiplyMultiplier={vi.fn()}
      onSubmitHand={vi.fn()}
      onDiscard={vi.fn()}
      canDiscard={true}
      onSetMoney={vi.fn()}
      selectedHand={HANDS[0]}
      hand={[]}
      remaining={[]}
      selectedIds={new Set()}
      discardingIds={new Set()}
      jokers={[]}
      onToggleCard={vi.fn()}
      onCardDiscardEnd={vi.fn()}
      {...overrides}
    />,
  );
}

describe("Game", () => {
  test("Win button calls onWin", async () => {
    const user = userEvent.setup();
    const onWin = vi.fn();
    renderGame({ onWin });
    await user.click(screen.getByText(/Win/));
    expect(onWin).toHaveBeenCalledTimes(1);
  });

  test("Win button calls onWin each time it is clicked", async () => {
    const user = userEvent.setup();
    const onWin = vi.fn();
    renderGame({ onWin });
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByText(/Win/));
    expect(onWin).toHaveBeenCalledTimes(3);
  });

  test("Add Chips button calls onAddChips with 10", async () => {
    const user = userEvent.setup();
    const onAddChips = vi.fn();
    renderGame({ onAddChips });
    await user.click(screen.getByText(/Add Chips/));
    expect(onAddChips).toHaveBeenCalledWith(10);
  });

  test("Add Multiplier button calls onAddMultiplier with 1", async () => {
    const user = userEvent.setup();
    const onAddMultiplier = vi.fn();
    renderGame({ onAddMultiplier });
    await user.click(screen.getByText(/Add Multiplier/));
    expect(onAddMultiplier).toHaveBeenCalledWith(1);
  });

  test("Multiply Multiplier button calls onMultiplyMultiplier with 2", async () => {
    const user = userEvent.setup();
    const onMultiplyMultiplier = vi.fn();
    renderGame({ onMultiplyMultiplier });
    await user.click(screen.getByText(/Multiply Multiplier/));
    expect(onMultiplyMultiplier).toHaveBeenCalledWith(2);
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

  test("displays the selected hand label in the read-only current hand area", () => {
    renderGame({ selectedHand: HANDS[3] });
    expect(screen.getByText(HANDS[3].label)).toBeInTheDocument();
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
});
