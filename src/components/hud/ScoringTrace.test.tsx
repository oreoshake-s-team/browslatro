import { describe, expect, test } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScoringTrace from "./ScoringTrace";
import type { ScoringEvent } from "../../scoring/scoringTrace";

function group(
  base: Omit<Extract<ScoringEvent, { kind: "hand-base" }>, "kind">,
  ...rest: ScoringEvent[]
): ScoringEvent[] {
  return [{ kind: "hand-base", ...base }, ...rest];
}

describe("ScoringTrace", () => {
  test("renders the empty state when there are no events", () => {
    render(<ScoringTrace events={[]} />);
    expect(screen.getByText("No scoring yet.")).toBeInTheDocument();
  });

  test("renders chip/mult events in the scoring list of a hand group", () => {
    const events = group(
      { chips: 10, mult: 2, handLabel: "Pair", level: 1 },
      { kind: "chips-delta", amount: 11, source: "A♠ rank" },
    );
    render(<ScoringTrace events={events} />);
    expect(screen.getByText("+11 Chips (A♠ rank)")).toBeInTheDocument();
  });

  test("renders a Money won sub-section when the group has money events", () => {
    const events = group(
      { chips: 10, mult: 2, handLabel: "Pair", level: 1 },
      { kind: "chips-delta", amount: 11, source: "A♠ rank" },
      { kind: "money-delta", amount: 3, source: "Gold card" },
    );
    render(<ScoringTrace events={events} />);
    expect(
      screen.getByRole("heading", { name: "Money won", level: 4 }),
    ).toBeInTheDocument();
  });

  test("Money won sub-section lists each money-delta event", () => {
    const events = group(
      { chips: 10, mult: 2, handLabel: "Pair", level: 1 },
      { kind: "money-delta", amount: 3, source: "Gold card" },
      { kind: "money-delta", amount: 1, source: "Interest" },
    );
    render(<ScoringTrace events={events} />);
    const heading = screen.getByRole("heading", { name: "Money won", level: 4 });
    const moneySection = heading.parentElement;
    if (!moneySection) throw new Error("Money sub-section root missing");
    expect(
      within(moneySection).getByText("+$1 (Interest)"),
    ).toBeInTheDocument();
  });

  test("suppresses the Money won heading when the group has no money events (negative)", () => {
    const events = group(
      { chips: 10, mult: 2, handLabel: "Pair", level: 1 },
      { kind: "chips-delta", amount: 11, source: "A♠ rank" },
    );
    render(<ScoringTrace events={events} />);
    expect(
      screen.queryByRole("heading", { name: "Money won", level: 4 }),
    ).not.toBeInTheDocument();
  });

  test("does not include money-delta lines in the scoring list (negative)", () => {
    const events = group(
      { chips: 10, mult: 2, handLabel: "Pair", level: 1 },
      { kind: "chips-delta", amount: 11, source: "A♠ rank" },
      { kind: "money-delta", amount: 3, source: "Gold card" },
    );
    render(<ScoringTrace events={events} />);
    const heading = screen.getByRole("heading", {
      name: /Hand 1: Pair/,
      level: 3,
    });
    const groupRoot = heading.parentElement;
    if (!groupRoot) throw new Error("group root missing");
    const scoringList = groupRoot.querySelector(
      "ol.scoring-trace__list:not(.scoring-trace__list--money)",
    );
    expect(scoringList?.textContent).not.toContain("Gold card");
  });

  test("renders the hand-base header even when the group only has money events", () => {
    const events = group(
      { chips: 10, mult: 2, handLabel: "Pair", level: 1 },
      { kind: "money-delta", amount: 3, source: "Gold card" },
    );
    render(<ScoringTrace events={events} />);
    expect(
      screen.getByRole("heading", { name: /Hand 1: Pair/, level: 3 }),
    ).toBeInTheDocument();
  });

  test("renders a per-hand total line resolving chips × mult = score", () => {
    const events = group(
      { chips: 10, mult: 2, handLabel: "Pair", level: 1 },
      { kind: "chips-delta", amount: 11, source: "A♠ rank" },
    );
    render(<ScoringTrace events={events} />);
    expect(screen.getByText("21 Chips × 2 Mult = 42")).toBeInTheDocument();
  });

  test("does not render a total line for a base-less orphan group (negative)", () => {
    const { container } = render(
      <ScoringTrace events={[{ kind: "chips-delta", amount: 5, source: "orphan" }]} />,
    );
    expect(container.querySelector(".scoring-trace__total")).toBeNull();
  });

  test("the scroll region is keyboard-focusable", () => {
    render(<ScoringTrace events={[]} />);
    const region = screen.getByRole("log");
    expect(region).toHaveAttribute("tabindex", "0");
  });
});

describe("ScoringTrace expand affordance", () => {
  test("renders an Expand button", () => {
    render(<ScoringTrace events={[]} />);
    expect(
      screen.getByRole("button", { name: "Expand" }),
    ).toBeInTheDocument();
  });

  test("does not render the dialog before the Expand button is pressed (negative)", () => {
    render(<ScoringTrace events={[]} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("pressing Expand opens the full-screen dialog", async () => {
    const user = userEvent.setup();
    render(<ScoringTrace events={[]} />);
    await user.click(screen.getByRole("button", { name: "Expand" }));
    await screen.findByRole("dialog");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("the expanded dialog shows the same scoring content", async () => {
    const user = userEvent.setup();
    const events = group(
      { chips: 10, mult: 2, handLabel: "Pair", level: 1 },
      { kind: "chips-delta", amount: 11, source: "A♠ rank" },
    );
    render(<ScoringTrace events={events} />);
    await user.click(screen.getByRole("button", { name: "Expand" }));
    await screen.findByRole("dialog");
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("+11 Chips (A♠ rank)")).toBeInTheDocument();
  });

  test("closing the dialog returns to the sidebar trace", async () => {
    const user = userEvent.setup();
    render(<ScoringTrace events={[]} />);
    await user.click(screen.getByRole("button", { name: "Expand" }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: /close scoring trace/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("expand button glyph is aria-hidden so it does not split the accessible name (#606)", () => {
    render(<ScoringTrace events={[]} />);
    const btn = screen.getByRole("button", { name: "Expand" });
    const decoration = btn.querySelector("span[aria-hidden='true']");
    expect(decoration).toHaveTextContent("⤢");
  });

  test("expand button keeps the long description on title for hover/voice (#640)", () => {
    render(<ScoringTrace events={[]} />);
    expect(screen.getByRole("button", { name: "Expand" })).toHaveAttribute(
      "title",
      "Expand scoring trace to full screen",
    );
  });
});
