import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RoundWonModal, { type RoundWonInfo } from "./RoundWonModal";

function buildInfo(overrides: Partial<RoundWonInfo> = {}): RoundWonInfo {
  return {
    roundScore: 400,
    requiredScore: 300,
    baseReward: 3,
    walletAtPayout: 15,
    interest: 3,
    goldHeldCount: 0,
    remainingHandsCount: 0,
    ...overrides,
  };
}

describe("RoundWonModal payout breakdown", () => {
  test("renders the base reward as its own row", () => {
    render(<RoundWonModal info={buildInfo({ baseReward: 4 })} onContinue={() => {}} />);
    expect(screen.getByTestId("round-won-base-reward")).toHaveTextContent("$4");
  });

  test("renders the interest as its own row", () => {
    render(<RoundWonModal info={buildInfo({ interest: 3 })} onContinue={() => {}} />);
    expect(screen.getByTestId("round-won-interest")).toHaveTextContent("+$3");
  });

  test("renders the interest row at $0 when the wallet is empty", () => {
    render(
      <RoundWonModal info={buildInfo({ walletAtPayout: 0, interest: 0 })} onContinue={() => {}} />,
    );
    expect(screen.getByTestId("round-won-interest")).toHaveTextContent("+$0");
  });

  test("renders the total as the sum of base reward and interest", () => {
    render(
      <RoundWonModal info={buildInfo({ baseReward: 4, interest: 3 })} onContinue={() => {}} />,
    );
    expect(screen.getByTestId("round-won-total")).toHaveTextContent("$7");
  });

  test("renders the gold row when one gold card is held", () => {
    render(
      <RoundWonModal info={buildInfo({ goldHeldCount: 1 })} onContinue={() => {}} />,
    );
    expect(screen.getByTestId("round-won-gold")).toHaveTextContent("+$3");
  });

  test("renders the gold row count in its label", () => {
    render(
      <RoundWonModal info={buildInfo({ goldHeldCount: 2 })} onContinue={() => {}} />,
    );
    expect(screen.getByTestId("round-won-gold-label")).toHaveTextContent("2 × $3");
  });

  test("does not render the gold row when no gold cards are held", () => {
    render(
      <RoundWonModal info={buildInfo({ goldHeldCount: 0 })} onContinue={() => {}} />,
    );
    expect(screen.queryByTestId("round-won-gold")).not.toBeInTheDocument();
  });

  test("includes the gold bonus in the total", () => {
    render(
      <RoundWonModal
        info={buildInfo({ baseReward: 3, interest: 1, goldHeldCount: 2 })}
        onContinue={() => {}}
      />,
    );
    expect(screen.getByTestId("round-won-total")).toHaveTextContent("$10");
  });

  test("renders the remaining-hands row when at least one hand was unused", () => {
    render(
      <RoundWonModal info={buildInfo({ remainingHandsCount: 2 })} onContinue={() => {}} />,
    );
    expect(screen.getByTestId("round-won-hands")).toHaveTextContent("+$2");
  });

  test("renders the remaining-hands row count in its label", () => {
    render(
      <RoundWonModal info={buildInfo({ remainingHandsCount: 3 })} onContinue={() => {}} />,
    );
    expect(screen.getByTestId("round-won-hands-label")).toHaveTextContent("3 × $1");
  });

  test("does not render the remaining-hands row when no hands were unused", () => {
    render(
      <RoundWonModal info={buildInfo({ remainingHandsCount: 0 })} onContinue={() => {}} />,
    );
    expect(screen.queryByTestId("round-won-hands")).not.toBeInTheDocument();
  });

  test("includes the remaining-hands bonus in the total", () => {
    render(
      <RoundWonModal
        info={buildInfo({
          baseReward: 3,
          interest: 1,
          goldHeldCount: 0,
          remainingHandsCount: 2,
        })}
        onContinue={() => {}}
      />,
    );
    expect(screen.getByTestId("round-won-total")).toHaveTextContent("$6");
  });

  test("shows the wallet balance in the interest row label", () => {
    render(<RoundWonModal info={buildInfo({ walletAtPayout: 15 })} onContinue={() => {}} />);
    expect(screen.getByTestId("round-won-interest-label")).toHaveTextContent("$15");
  });

  test("shows the per-interest rate in the interest row label", () => {
    render(<RoundWonModal info={buildInfo()} onContinue={() => {}} />);
    expect(screen.getByTestId("round-won-interest-label")).toHaveTextContent("$1 per $5");
  });

  test("shows the interest cap in the interest row label", () => {
    render(<RoundWonModal info={buildInfo()} onContinue={() => {}} />);
    expect(screen.getByTestId("round-won-interest-label")).toHaveTextContent("max $5");
  });

  test("Continue button invokes the onContinue callback", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<RoundWonModal info={buildInfo()} onContinue={onContinue} />);
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  test("Escape invokes the onContinue callback while the modal is open", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(<RoundWonModal info={buildInfo()} onContinue={onContinue} />);
    await user.keyboard("{Escape}");
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  test("Escape does not invoke onContinue after the modal is unmounted", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const { unmount } = render(
      <RoundWonModal info={buildInfo()} onContinue={onContinue} />,
    );
    unmount();
    await user.keyboard("{Escape}");
    expect(onContinue).not.toHaveBeenCalled();
  });

  test("a non-Escape global keydown does not invoke onContinue", () => {
    const onContinue = vi.fn();
    render(<RoundWonModal info={buildInfo()} onContinue={onContinue} />);
    fireEvent.keyDown(window, { key: "a" });
    expect(onContinue).not.toHaveBeenCalled();
  });
});
