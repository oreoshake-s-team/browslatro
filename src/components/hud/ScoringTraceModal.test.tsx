import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScoringTraceModal from "./ScoringTraceModal";
import type { ScoringEvent } from "../../scoring/scoringTrace";

function group(
  base: Omit<Extract<ScoringEvent, { kind: "hand-base" }>, "kind">,
  ...rest: ScoringEvent[]
): ScoringEvent[] {
  return [{ kind: "hand-base", ...base }, ...rest];
}

describe("ScoringTraceModal", () => {
  test("renders a modal dialog", () => {
    render(<ScoringTraceModal events={[]} onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("renders the Scoring Trace title", () => {
    render(<ScoringTraceModal events={[]} onClose={() => {}} />);
    expect(
      screen.getByRole("heading", { name: "Scoring Trace", level: 2 }),
    ).toBeInTheDocument();
  });

  test("renders the empty state when there are no events", () => {
    render(<ScoringTraceModal events={[]} onClose={() => {}} />);
    expect(screen.getByText("No scoring yet.")).toBeInTheDocument();
  });

  test("renders the scoring content for a hand", () => {
    const events = group(
      { chips: 10, mult: 2, handLabel: "Pair", level: 1 },
      { kind: "chips-delta", amount: 11, source: "A♠ rank" },
    );
    render(<ScoringTraceModal events={events} onClose={() => {}} />);
    expect(screen.getByText("+11 Chips (A♠ rank)")).toBeInTheDocument();
  });

  test("the Close button invokes onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ScoringTraceModal events={[]} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: /close scoring trace/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("Escape invokes onClose while the modal is open", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ScoringTraceModal events={[]} onClose={onClose} />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("clicking the backdrop invokes onClose", () => {
    const onClose = vi.fn();
    render(<ScoringTraceModal events={[]} onClose={onClose} />);
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("clicking inside the modal does not invoke onClose (negative)", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ScoringTraceModal events={[]} onClose={onClose} />);
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("heading", { name: "Scoring Trace" }));
    expect(onClose).not.toHaveBeenCalled();
  });

  test("a non-Escape global keydown does not invoke onClose (negative)", () => {
    const onClose = vi.fn();
    render(<ScoringTraceModal events={[]} onClose={onClose} />);
    fireEvent.keyDown(window, { key: "a" });
    expect(onClose).not.toHaveBeenCalled();
  });

  test("Escape does not invoke onClose after the modal is unmounted (negative)", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { unmount } = render(<ScoringTraceModal events={[]} onClose={onClose} />);
    unmount();
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("ScoringTraceModal focus trap", () => {
  test("traps Tab inside the dialog and restores focus to the opener on close", async () => {
    const user = userEvent.setup();
    render(<button data-testid="opener">opener</button>);
    screen.getByTestId("opener").focus();
    const view = render(<ScoringTraceModal events={[]} onClose={() => {}} />);
    const close = screen.getByRole("button", { name: /close scoring trace/i });
    const body = screen.getByRole("log");
    expect(close).toHaveFocus();
    await user.tab();
    expect(body).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab({ shift: true });
    expect(body).toHaveFocus();
    view.unmount();
    expect(screen.getByTestId("opener")).toHaveFocus();
  });

  test("marks the app shell inert while the dialog is open", () => {
    const shell = document.createElement("div");
    shell.setAttribute("data-app-shell", "");
    document.body.appendChild(shell);
    const view = render(<ScoringTraceModal events={[]} onClose={() => {}} />);
    expect(shell).toHaveAttribute("inert");
    view.unmount();
    expect(shell).not.toHaveAttribute("inert");
    shell.remove();
  });
});
