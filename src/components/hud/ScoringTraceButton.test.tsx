import { describe, expect, test } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScoringTraceButton from "./ScoringTraceButton";
import type { ScoringEvent } from "../../scoring/scoringTrace";

const events: ScoringEvent[] = [
  { kind: "hand-base", chips: 10, mult: 2, handLabel: "Pair", level: 1 },
  { kind: "chips-delta", amount: 11, source: "A♠ rank" },
];

describe("ScoringTraceButton", () => {
  test("renders the provided label as the button text", () => {
    render(
      <ScoringTraceButton events={events} className="custom">
        Scoring Log
      </ScoringTraceButton>,
    );
    expect(
      screen.getByRole("button", { name: "Scoring Log" }),
    ).toBeInTheDocument();
  });

  test("applies the provided class name to the button", () => {
    render(
      <ScoringTraceButton events={events} className="custom">
        Scoring Log
      </ScoringTraceButton>,
    );
    expect(screen.getByRole("button", { name: "Scoring Log" })).toHaveClass(
      "custom",
    );
  });

  test("does not render the dialog before the button is pressed (negative)", () => {
    render(
      <ScoringTraceButton events={events} className="custom">
        Scoring Log
      </ScoringTraceButton>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("pressing the button opens the full-screen scoring dialog", async () => {
    const user = userEvent.setup();
    render(
      <ScoringTraceButton events={events} className="custom">
        Scoring Log
      </ScoringTraceButton>,
    );
    await user.click(screen.getByRole("button", { name: "Scoring Log" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("+11 Chips (A♠ rank)")).toBeInTheDocument();
  });

  test("closing the dialog removes it from the document", async () => {
    const user = userEvent.setup();
    render(
      <ScoringTraceButton events={events} className="custom">
        Scoring Log
      </ScoringTraceButton>,
    );
    await user.click(screen.getByRole("button", { name: "Scoring Log" }));
    await screen.findByRole("dialog");
    await user.click(
      screen.getByRole("button", { name: /close scoring trace/i }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
