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
    render(<GameWonScreen info={buildInfo()} onNewRun={() => {}} onEndless={() => {}} />);
    expect(screen.getByRole("heading", { name: "You Win!" })).toBeInTheDocument();
  });

  test("renders the final ante", () => {
    render(<GameWonScreen info={buildInfo()} onNewRun={() => {}} onEndless={() => {}} />);
    expect(screen.getByTestId("game-won-final-ante")).toHaveTextContent("8");
  });

  test("renders the final money with a leading $", () => {
    render(<GameWonScreen info={buildInfo()} onNewRun={() => {}} onEndless={() => {}} />);
    expect(screen.getByTestId("game-won-final-money")).toHaveTextContent("$73");
  });

  test("renders the hands-played run stat", () => {
    render(<GameWonScreen info={buildInfo()} onNewRun={() => {}} onEndless={() => {}} />);
    expect(screen.getByTestId("game-won-hands-played")).toHaveTextContent("22");
  });

  test("renders the blinds-skipped run stat", () => {
    render(<GameWonScreen info={buildInfo()} onNewRun={() => {}} onEndless={() => {}} />);
    expect(screen.getByTestId("game-won-blinds-skipped")).toHaveTextContent("1");
  });

  test("exposes the screen as an aria-labelled dialog", () => {
    render(<GameWonScreen info={buildInfo()} onNewRun={() => {}} onEndless={() => {}} />);
    expect(screen.getByRole("dialog", { name: "You Win!" })).toBeInTheDocument();
  });

  test("fires onNewRun when the new-run button is clicked", async () => {
    const onNewRun = vi.fn();
    const user = userEvent.setup();
    render(<GameWonScreen info={buildInfo()} onNewRun={onNewRun} onEndless={() => {}} />);
    await user.click(screen.getByTestId("game-won-new-run"));
    expect(onNewRun).toHaveBeenCalledTimes(1);
  });

  test("fires onEndless when the endless-mode button is clicked", async () => {
    const onEndless = vi.fn();
    const user = userEvent.setup();
    render(
      <GameWonScreen
        info={buildInfo()}
        onNewRun={() => {}}
        onEndless={onEndless}
      />,
    );
    await user.click(screen.getByTestId("game-won-endless"));
    expect(onEndless).toHaveBeenCalledTimes(1);
  });

  test("clicking the endless-mode button does not fire onNewRun (negative)", async () => {
    const onNewRun = vi.fn();
    const user = userEvent.setup();
    render(
      <GameWonScreen
        info={buildInfo()}
        onNewRun={onNewRun}
        onEndless={() => {}}
      />,
    );
    await user.click(screen.getByTestId("game-won-endless"));
    expect(onNewRun).not.toHaveBeenCalled();
  });

  test("fires onNewRun when Escape is pressed", () => {
    const onNewRun = vi.fn();
    render(<GameWonScreen info={buildInfo()} onNewRun={onNewRun} onEndless={() => {}} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onNewRun).toHaveBeenCalledTimes(1);
  });
});

describe("GameWonScreen i18n (#922)", () => {
  afterEach(async () => {
    const { restoreEnglishLocale } = await import("../../i18n/i18n.test-helpers");
    await restoreEnglishLocale();
  });

  test("the title renders Lanakila! under the haw locale", async () => {
    const { default: i18n } = await import("../../i18n");
    await i18n.changeLanguage("haw");
    render(
      <GameWonScreen info={buildInfo()} onNewRun={() => {}} onEndless={() => {}} />,
    );
    expect(
      screen.getByRole("heading", { name: "Lanakila!" }),
    ).toBeInTheDocument();
  });
});

describe("GameWonScreen focus trap (#949)", () => {
  test("traps Tab inside the dialog and restores focus to the opener on close", async () => {
    const user = userEvent.setup();
    render(<button data-testid="opener">opener</button>);
    screen.getByTestId("opener").focus();
    const view = render(
      <GameWonScreen info={buildInfo()} onNewRun={() => {}} onEndless={() => {}} />,
    );
    const endless = screen.getByTestId("game-won-endless");
    const newRun = screen.getByTestId("game-won-new-run");
    expect(endless).toHaveFocus();
    await user.tab();
    expect(newRun).toHaveFocus();
    await user.tab();
    expect(endless).toHaveFocus();
    await user.tab({ shift: true });
    expect(newRun).toHaveFocus();
    view.unmount();
    expect(screen.getByTestId("opener")).toHaveFocus();
  });

  test("marks the app shell inert while the dialog is open", () => {
    const shell = document.createElement("div");
    shell.setAttribute("data-app-shell", "");
    document.body.appendChild(shell);
    const view = render(
      <GameWonScreen info={buildInfo()} onNewRun={() => {}} onEndless={() => {}} />,
    );
    expect(shell).toHaveAttribute("inert");
    view.unmount();
    expect(shell).not.toHaveAttribute("inert");
    shell.remove();
  });
});
