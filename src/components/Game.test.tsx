import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import Game from "./Game";

function renderGame(overrides: Partial<ComponentProps<typeof Game>> = {}) {
  return render(
    <Game
      onWin={jest.fn()}
      onAddChips={jest.fn()}
      onAddMultiplier={jest.fn()}
      onMultiplyMultiplier={jest.fn()}
      onSubmitHand={jest.fn()}
      onSetMoney={jest.fn()}
      {...overrides}
    />,
  );
}

describe("Game", () => {
  test("Win button calls onWin", () => {
    const onWin = jest.fn();
    renderGame({ onWin });
    userEvent.click(screen.getByText(/Win/));
    expect(onWin).toHaveBeenCalledTimes(1);
  });

  test("Win button calls onWin each time it is clicked", () => {
    const onWin = jest.fn();
    renderGame({ onWin });
    userEvent.click(screen.getByText(/Win/));
    userEvent.click(screen.getByText(/Win/));
    userEvent.click(screen.getByText(/Win/));
    expect(onWin).toHaveBeenCalledTimes(3);
  });

  test("Add Chips button calls onAddChips with 10", () => {
    const onAddChips = jest.fn();
    renderGame({ onAddChips });
    userEvent.click(screen.getByText(/Add Chips/));
    expect(onAddChips).toHaveBeenCalledWith(10);
  });

  test("Add Multiplier button calls onAddMultiplier with 1", () => {
    const onAddMultiplier = jest.fn();
    renderGame({ onAddMultiplier });
    userEvent.click(screen.getByText(/Add Multiplier/));
    expect(onAddMultiplier).toHaveBeenCalledWith(1);
  });

  test("Multiply Multiplier button calls onMultiplyMultiplier with 2", () => {
    const onMultiplyMultiplier = jest.fn();
    renderGame({ onMultiplyMultiplier });
    userEvent.click(screen.getByText(/Multiply Multiplier/));
    expect(onMultiplyMultiplier).toHaveBeenCalledWith(2);
  });

  test("Submit Hand button calls onSubmitHand", () => {
    const onSubmitHand = jest.fn();
    renderGame({ onSubmitHand });
    userEvent.click(screen.getByText(/Submit Hand/));
    expect(onSubmitHand).toHaveBeenCalledTimes(1);
  });
});
