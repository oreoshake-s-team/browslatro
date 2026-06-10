import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RoundWonModal, { type RoundWonInfo } from "./RoundWonModal";

function buildInfo(overrides: Partial<RoundWonInfo> = {}): RoundWonInfo {
  return {
    roundScore: 400,
    requiredScore: 300,
    baseReward: 3,
    walletAtPayout: 15,
    interestWallet: 15,
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

  test("shows the interest-wallet balance in the interest row label", () => {
    render(
      <RoundWonModal
        info={buildInfo({ interestWallet: 12 })}
        onContinue={() => {}}
      />,
    );
    expect(screen.getByTestId("round-won-interest-label")).toHaveTextContent("$12");
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

  test("interest row uses interestWallet, not walletAtPayout (#353)", () => {
    render(
      <RoundWonModal
        info={buildInfo({
          walletAtPayout: 10,
          interestWallet: 7,
          interest: 1,
        })}
        onContinue={() => {}}
      />,
    );
    expect(screen.getByTestId("round-won-interest-label")).toHaveTextContent("$7");
    expect(screen.getByTestId("round-won-interest")).toHaveTextContent("+$1");
  });

  test("renders a row for each end-of-round joker step (#620)", () => {
    render(
      <RoundWonModal
        info={buildInfo({
          endOfRoundJokerSteps: [
            { jokerId: "cloud-9", jokerName: "Cloud 9", moneyEarned: 4 },
          ],
        })}
        onContinue={() => {}}
      />,
    );
    expect(screen.getByTestId("round-won-joker-amount-cloud-9")).toHaveTextContent(
      "+$4",
    );
  });

  test("labels each end-of-round joker row with the joker name (#620)", () => {
    render(
      <RoundWonModal
        info={buildInfo({
          endOfRoundJokerSteps: [
            { jokerId: "cloud-9", jokerName: "Cloud 9", moneyEarned: 4 },
          ],
        })}
        onContinue={() => {}}
      />,
    );
    expect(screen.getByTestId("round-won-joker-label-cloud-9")).toHaveTextContent(
      "Cloud 9",
    );
  });

  test("renders multiple end-of-round joker rows when several jokers paid out (#620)", () => {
    render(
      <RoundWonModal
        info={buildInfo({
          endOfRoundJokerSteps: [
            { jokerId: "cloud-9", jokerName: "Cloud 9", moneyEarned: 4 },
            {
              jokerId: "delayed-gratification",
              jokerName: "Delayed Gratification",
              moneyEarned: 6,
            },
          ],
        })}
        onContinue={() => {}}
      />,
    );
    expect(
      screen.getByTestId("round-won-joker-amount-delayed-gratification"),
    ).toHaveTextContent("+$6");
  });

  test("includes end-of-round joker payouts in the total (#620)", () => {
    render(
      <RoundWonModal
        info={buildInfo({
          baseReward: 3,
          interest: 1,
          endOfRoundJokerSteps: [
            { jokerId: "cloud-9", jokerName: "Cloud 9", moneyEarned: 4 },
          ],
        })}
        onContinue={() => {}}
      />,
    );
    expect(screen.getByTestId("round-won-total")).toHaveTextContent("$8");
  });

  test("does not render any joker rows when no end-of-round jokers paid out (negative, #620)", () => {
    render(<RoundWonModal info={buildInfo()} onContinue={() => {}} />);
    expect(screen.queryByTestId("round-won-joker-row-cloud-9")).not.toBeInTheDocument();
  });

  test("does not render any joker rows when endOfRoundJokerSteps is an empty array (negative, #620)", () => {
    const { container } = render(
      <RoundWonModal
        info={buildInfo({ endOfRoundJokerSteps: [] })}
        onContinue={() => {}}
      />,
    );
    expect(
      container.querySelector("[data-testid^='round-won-joker-row-']"),
    ).toBeNull();
  });

  test("renders a negative-amount joker step with a -$N prefix (#580 Rental)", () => {
    render(
      <RoundWonModal
        info={buildInfo({
          endOfRoundJokerSteps: [
            {
              jokerId: "business-card-rental",
              jokerName: "Business Card (Rental)",
              moneyEarned: -3,
            },
          ],
        })}
        onContinue={() => {}}
      />,
    );
    expect(
      screen.getByTestId("round-won-joker-amount-business-card-rental"),
    ).toHaveTextContent("-$3");
  });

  test("subtracts a Rental drain from the total (#580)", () => {
    render(
      <RoundWonModal
        info={buildInfo({
          baseReward: 5,
          interest: 0,
          endOfRoundJokerSteps: [
            {
              jokerId: "business-card-rental",
              jokerName: "Business Card (Rental)",
              moneyEarned: -3,
            },
          ],
        })}
        onContinue={() => {}}
      />,
    );
    expect(screen.getByTestId("round-won-total")).toHaveTextContent("$2");
  });
});

describe("RoundWonModal — Green Deck payout (closes #818)", () => {
  test("renders the combined hands+discards bonus row when usesHandsAndDiscardsBonus is true", () => {
    render(
      <RoundWonModal
        info={buildInfo({
          remainingHandsCount: 3,
          remainingDiscardsCount: 2,
          remainingHandsBonusPerUnit: 2,
          usesHandsAndDiscardsBonus: true,
        })}
        onContinue={() => {}}
      />,
    );
    expect(screen.getByTestId("round-won-hands-label")).toHaveTextContent(
      "Remaining hands + discards (5 × $2)",
    );
    expect(screen.getByTestId("round-won-hands")).toHaveTextContent("+$10");
  });

  test("suppresses the interest row entirely when usesHandsAndDiscardsBonus is true", () => {
    render(
      <RoundWonModal
        info={buildInfo({
          remainingHandsCount: 1,
          remainingDiscardsCount: 0,
          remainingHandsBonusPerUnit: 2,
          usesHandsAndDiscardsBonus: true,
          interest: 0,
        })}
        onContinue={() => {}}
      />,
    );
    expect(screen.queryByTestId("round-won-interest")).not.toBeInTheDocument();
  });

  test("falls back to default 'Remaining hands' label when the flag is omitted (negative)", () => {
    render(
      <RoundWonModal
        info={buildInfo({ remainingHandsCount: 2 })}
        onContinue={() => {}}
      />,
    );
    expect(screen.getByTestId("round-won-hands-label")).toHaveTextContent(
      "Remaining hands (2 × $1)",
    );
  });

  test("total includes the (hands + discards) × $2 bonus", () => {
    render(
      <RoundWonModal
        info={buildInfo({
          baseReward: 3,
          interest: 0,
          remainingHandsCount: 2,
          remainingDiscardsCount: 3,
          remainingHandsBonusPerUnit: 2,
          usesHandsAndDiscardsBonus: true,
        })}
        onContinue={() => {}}
      />,
    );
    expect(screen.getByTestId("round-won-total")).toHaveTextContent("$13");
  });

  test("hides the bonus row when bonusUnits is zero on Green Deck (negative)", () => {
    render(
      <RoundWonModal
        info={buildInfo({
          remainingHandsCount: 0,
          remainingDiscardsCount: 0,
          remainingHandsBonusPerUnit: 2,
          usesHandsAndDiscardsBonus: true,
        })}
        onContinue={() => {}}
      />,
    );
    expect(screen.queryByTestId("round-won-hands")).not.toBeInTheDocument();
  });
});

describe("RoundWonModal focus trap (#907)", () => {
  test("traps Tab on the Continue button and restores focus to the opener on close", async () => {
    const user = userEvent.setup();
    render(<button data-testid="opener">opener</button>);
    screen.getByTestId("opener").focus();
    const view = render(
      <RoundWonModal info={buildInfo()} onContinue={() => {}} />,
    );
    const continueButton = screen.getByRole("button", { name: /Continue/ });
    expect(continueButton).toHaveFocus();
    await user.tab();
    expect(continueButton).toHaveFocus();
    await user.tab({ shift: true });
    expect(continueButton).toHaveFocus();
    view.unmount();
    expect(screen.getByTestId("opener")).toHaveFocus();
  });
});

describe("RoundWonModal i18n (#922)", () => {
  afterEach(async () => {
    const { default: i18n } = await import("../../i18n");
    await i18n.changeLanguage("en");
  });

  test("the continue button renders Hoʻomau under the haw locale", async () => {
    const { default: i18n } = await import("../../i18n");
    await i18n.changeLanguage("haw");
    render(<RoundWonModal info={buildInfo()} onContinue={() => {}} />);
    expect(screen.getByRole("button", { name: "Hoʻomau →" })).toBeInTheDocument();
  });

  test("the total row label renders Huina under the haw locale", async () => {
    const { default: i18n } = await import("../../i18n");
    await i18n.changeLanguage("haw");
    render(<RoundWonModal info={buildInfo()} onContinue={() => {}} />);
    expect(screen.getByText("Huina")).toBeInTheDocument();
  });

  test("the interest label keeps its interpolated values under the haw locale", async () => {
    const { default: i18n } = await import("../../i18n");
    await i18n.changeLanguage("haw");
    render(
      <RoundWonModal
        info={buildInfo({ interestWallet: 15 })}
        onContinue={() => {}}
      />,
    );
    expect(screen.getByTestId("round-won-interest-label")).toHaveTextContent(
      "on $15",
    );
  });
});
