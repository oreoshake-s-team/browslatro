import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GameWonScreen from "./GameWonScreen";
import type { GameWonInfo } from "../../store/progression";

function buildInfo(overrides: Partial<GameWonInfo> = {}): GameWonInfo {
  return {
    finalAnte: 8,
    finalMoney: 73,
    handsPlayed: 22,
    blindsSkipped: 1,
    ...overrides,
  };
}

describe("GameWonScreen", () => {
  test("renders the You Win! heading", () => {
    render(<GameWonScreen info={buildInfo()} onNewRun={() => {}} />);
    expect(screen.getByRole("heading", { name: "You Win!" })).toBeInTheDocument();
  });

  test("renders the final ante", () => {
    render(<GameWonScreen info={buildInfo()} onNewRun={() => {}} />);
    expect(screen.getByTestId("game-won-final-ante")).toHaveTextContent("8");
  });

  test("renders the final money with a leading $", () => {
    render(<GameWonScreen info={buildInfo()} onNewRun={() => {}} />);
    expect(screen.getByTestId("game-won-final-money")).toHaveTextContent("$73");
  });

  test("renders the hands-played run stat", () => {
    render(<GameWonScreen info={buildInfo()} onNewRun={() => {}} />);
    expect(screen.getByTestId("game-won-hands-played")).toHaveTextContent("22");
  });

  test("renders the blinds-skipped run stat", () => {
    render(<GameWonScreen info={buildInfo()} onNewRun={() => {}} />);
    expect(screen.getByTestId("game-won-blinds-skipped")).toHaveTextContent("1");
  });

  test("exposes the screen as an aria-labelled dialog", () => {
    render(<GameWonScreen info={buildInfo()} onNewRun={() => {}} />);
    expect(screen.getByRole("dialog", { name: "You Win!" })).toBeInTheDocument();
  });

  test("fires onNewRun when the new-run button is clicked", async () => {
    const onNewRun = vi.fn();
    const user = userEvent.setup();
    render(<GameWonScreen info={buildInfo()} onNewRun={onNewRun} />);
    await user.click(screen.getByTestId("game-won-new-run"));
    expect(onNewRun).toHaveBeenCalledTimes(1);
  });

  test("fires onNewRun when Escape is pressed", () => {
    const onNewRun = vi.fn();
    render(<GameWonScreen info={buildInfo()} onNewRun={onNewRun} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onNewRun).toHaveBeenCalledTimes(1);
  });
});
