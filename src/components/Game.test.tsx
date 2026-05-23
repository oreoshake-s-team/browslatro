import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Game from "./Game";

describe("Game", () => {
  test("Win button calls onWin", () => {
    const onWin = jest.fn();
    render(
      <Game
        onWin={onWin}
        onAddChips={jest.fn()}
        onAddMultiplier={jest.fn()}
        onMultiplyMultiplier={jest.fn()}
      />,
    );
    userEvent.click(screen.getByText("Win"));
    expect(onWin).toHaveBeenCalledTimes(1);
  });

  test("Win button calls onWin each time it is clicked", () => {
    const onWin = jest.fn();
    render(
      <Game
        onWin={onWin}
        onAddChips={jest.fn()}
        onAddMultiplier={jest.fn()}
        onMultiplyMultiplier={jest.fn()}
      />,
    );
    userEvent.click(screen.getByText("Win"));
    userEvent.click(screen.getByText("Win"));
    userEvent.click(screen.getByText("Win"));
    expect(onWin).toHaveBeenCalledTimes(3);
  });
});
