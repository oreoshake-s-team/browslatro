import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RoundLostModal, { type RoundLostInfo } from "./RoundLostModal";

function buildInfo(overrides: Partial<RoundLostInfo> = {}): RoundLostInfo {
  return {
    roundScore: 1724,
    requiredScore: 1800,
    ...overrides,
  };
}

describe("RoundLostModal", () => {
  test("renders the post-final-hand round score", () => {
    render(<RoundLostModal info={buildInfo()} onContinue={() => {}} />);
    expect(screen.getByTestId("round-lost-score")).toHaveTextContent("1724");
  });

  test("renders the required score", () => {
    render(<RoundLostModal info={buildInfo()} onContinue={() => {}} />);
    expect(screen.getByTestId("round-lost-required")).toHaveTextContent("1800");
  });

  test("renders the deficit as Short by", () => {
    render(<RoundLostModal info={buildInfo()} onContinue={() => {}} />);
    expect(screen.getByTestId("round-lost-short-by")).toHaveTextContent("76");
  });

  test("clamps the deficit to 0 when score meets the requirement (defensive)", () => {
    render(
      <RoundLostModal
        info={buildInfo({ roundScore: 1800 })}
        onContinue={() => {}}
      />,
    );
    expect(screen.getByTestId("round-lost-short-by")).toHaveTextContent("0");
  });

  test("renders a dialog with an accessible label", () => {
    render(<RoundLostModal info={buildInfo()} onContinue={() => {}} />);
    expect(screen.getByRole("dialog", { name: "Game Over" })).toBeInTheDocument();
  });

  test("fires onContinue when the Try again button is clicked", async () => {
    const onContinue = vi.fn();
    const user = userEvent.setup();
    render(<RoundLostModal info={buildInfo()} onContinue={onContinue} />);
    await user.click(screen.getByRole("button", { name: /Try again/ }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  test("fires onContinue when Escape is pressed", () => {
    const onContinue = vi.fn();
    render(<RoundLostModal info={buildInfo()} onContinue={onContinue} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});

describe("RoundLostModal i18n (#922)", () => {
  afterEach(async () => {
    const { restoreEnglishLocale } = await import("../../i18n/i18n.test-helpers");
    await restoreEnglishLocale();
  });

  test("the try-again button renders E hoʻāʻo hou under the haw locale", async () => {
    const { default: i18n } = await import("../../i18n");
    await i18n.changeLanguage("haw");
    render(
      <RoundLostModal
        info={{ roundScore: 10, requiredScore: 300 }}
        onContinue={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "E hoʻāʻo hou →" }),
    ).toBeInTheDocument();
  });
});

describe("RoundLostModal focus trap (#949)", () => {
  test("traps Tab on the Try again button and restores focus to the opener on close", async () => {
    const user = userEvent.setup();
    render(<button data-testid="opener">opener</button>);
    screen.getByTestId("opener").focus();
    const view = render(<RoundLostModal info={buildInfo()} onContinue={() => {}} />);
    const tryAgain = screen.getByRole("button", { name: /Try again/ });
    expect(tryAgain).toHaveFocus();
    await user.tab();
    expect(tryAgain).toHaveFocus();
    await user.tab({ shift: true });
    expect(tryAgain).toHaveFocus();
    view.unmount();
    expect(screen.getByTestId("opener")).toHaveFocus();
  });

  test("marks the app shell inert while the dialog is open", () => {
    const shell = document.createElement("div");
    shell.setAttribute("data-app-shell", "");
    document.body.appendChild(shell);
    const view = render(<RoundLostModal info={buildInfo()} onContinue={() => {}} />);
    expect(shell).toHaveAttribute("inert");
    view.unmount();
    expect(shell).not.toHaveAttribute("inert");
    shell.remove();
  });
});
