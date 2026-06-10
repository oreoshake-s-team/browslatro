import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import JokerGrantAcknowledge from "./JokerGrantAcknowledge";
import { createPlusFourMultJoker } from "../../items/jokers";

describe("JokerGrantAcknowledge", () => {
  test("renders a modal dialog when a joker is granted", () => {
    render(
      <JokerGrantAcknowledge
        jokers={[createPlusFourMultJoker()]}
        onAcknowledge={vi.fn()}
      />,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("renders nothing when no jokers are granted (negative)", () => {
    render(<JokerGrantAcknowledge jokers={[]} onAcknowledge={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("invokes onAcknowledge when OK is clicked", async () => {
    const user = userEvent.setup();
    const onAcknowledge = vi.fn();
    render(
      <JokerGrantAcknowledge
        jokers={[createPlusFourMultJoker()]}
        onAcknowledge={onAcknowledge}
      />,
    );
    await user.click(screen.getByTestId("joker-grant-ok"));
    expect(onAcknowledge).toHaveBeenCalledTimes(1);
  });

  test("pressing Escape invokes onAcknowledge (#915)", async () => {
    const user = userEvent.setup();
    const onAcknowledge = vi.fn();
    render(
      <JokerGrantAcknowledge
        jokers={[createPlusFourMultJoker()]}
        onAcknowledge={onAcknowledge}
      />,
    );
    await user.keyboard("{Escape}");
    expect(onAcknowledge).toHaveBeenCalledTimes(1);
  });

  test("Escape does nothing while no jokers are pending (negative, #915)", async () => {
    const user = userEvent.setup();
    const onAcknowledge = vi.fn();
    render(<JokerGrantAcknowledge jokers={[]} onAcknowledge={onAcknowledge} />);
    await user.keyboard("{Escape}");
    expect(onAcknowledge).not.toHaveBeenCalled();
  });
});

describe("JokerGrantAcknowledge focus trap (#907)", () => {
  test("traps Tab on the OK button and restores focus to the opener on close", async () => {
    const user = userEvent.setup();
    render(<button data-testid="opener">opener</button>);
    screen.getByTestId("opener").focus();
    const view = render(
      <JokerGrantAcknowledge
        jokers={[createPlusFourMultJoker()]}
        onAcknowledge={vi.fn()}
      />,
    );
    const okButton = screen.getByTestId("joker-grant-ok");
    expect(okButton).toHaveFocus();
    await user.tab();
    expect(okButton).toHaveFocus();
    await user.tab({ shift: true });
    expect(okButton).toHaveFocus();
    view.unmount();
    expect(screen.getByTestId("opener")).toHaveFocus();
  });
});
