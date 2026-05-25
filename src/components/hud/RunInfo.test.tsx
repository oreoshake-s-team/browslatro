import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RunInfo, { emptyHandCounts, type HandPlayCounts } from "./RunInfo";
import { HANDS } from "../../constants";
import type { HandLabel } from "../../handEvaluator";
import { createDefaultHandStats, type HandStats } from "../../handStats";

const defaultStats: HandStats = createDefaultHandStats();

function buildCounts(overrides: Partial<Record<HandLabel, number>> = {}): HandPlayCounts {
  return { ...emptyHandCounts(), ...overrides };
}

describe("RunInfo trigger", () => {
  test("renders a button labeled Run info", () => {
    render(<RunInfo handPlayCounts={buildCounts()} handStats={defaultStats} />);
    expect(screen.getByRole("button", { name: "Run info" })).toBeInTheDocument();
  });

  test("does not render the dialog on initial render", () => {
    render(<RunInfo handPlayCounts={buildCounts()} handStats={defaultStats} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("clicking the trigger opens a dialog", async () => {
    const user = userEvent.setup();
    render(<RunInfo handPlayCounts={buildCounts()} handStats={defaultStats} />);
    await user.click(screen.getByRole("button", { name: "Run info" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("opened dialog is labelled by the Run Information heading", async () => {
    const user = userEvent.setup();
    render(<RunInfo handPlayCounts={buildCounts()} handStats={defaultStats} />);
    await user.click(screen.getByRole("button", { name: "Run info" }));
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Run Information");
  });
});

describe("RunInfo dialog content", () => {
  async function openDialog(counts: HandPlayCounts = buildCounts()): Promise<void> {
    const user = userEvent.setup();
    render(<RunInfo handPlayCounts={counts} handStats={defaultStats} />);
    await user.click(screen.getByRole("button", { name: "Run info" }));
  }

  test("renders a row for every HANDS entry", async () => {
    await openDialog();
    for (const hand of HANDS) {
      expect(
        screen.getByTestId(`run-info-row-${hand.label}`),
      ).toBeInTheDocument();
    }
  });

  test("renders the chips × mult baseline for each hand", async () => {
    await openDialog();
    for (const hand of HANDS) {
      const row = screen.getByTestId(`run-info-row-${hand.label}`);
      expect(row).toHaveTextContent(`${hand.chips} × ${hand.multiplier}`);
    }
  });

  test("renders the play count from props for each hand", async () => {
    await openDialog(buildCounts({ Pair: 7, Flush: 2 }));
    expect(screen.getByTestId("run-info-count-Pair")).toHaveTextContent("7");
  });

  test("renders zero for a hand with no plays", async () => {
    await openDialog(buildCounts({ Pair: 7 }));
    expect(screen.getByTestId("run-info-count-Flush")).toHaveTextContent("0");
  });

  test("renders in reverse HANDS order (highest tier first)", async () => {
    await openDialog();
    const rowHeadings = Array.from(
      document.querySelectorAll(".run-info-table tbody th"),
    ).map((el) => el.textContent);
    expect(rowHeadings).toEqual([...HANDS].reverse().map((h) => h.label));
  });
});

describe("RunInfo with upgraded handStats", () => {
  test("renders upgraded chips × mult for a hand whose stats are above baseline", async () => {
    const upgraded: HandStats = {
      ...defaultStats,
      "High Card": { chips: 15, multiplier: 2, level: 2 },
    };
    const user = userEvent.setup();
    render(<RunInfo handPlayCounts={buildCounts()} handStats={upgraded} />);
    await user.click(screen.getByRole("button", { name: "Run info" }));
    expect(screen.getByTestId("run-info-stats-High Card")).toHaveTextContent(
      "15 × 2",
    );
  });

  test("renders the upgraded level for the hand", async () => {
    const upgraded: HandStats = {
      ...defaultStats,
      "High Card": { chips: 15, multiplier: 2, level: 2 },
    };
    const user = userEvent.setup();
    render(<RunInfo handPlayCounts={buildCounts()} handStats={upgraded} />);
    await user.click(screen.getByRole("button", { name: "Run info" }));
    expect(screen.getByTestId("run-info-level-High Card")).toHaveTextContent(
      "2",
    );
  });

  test("non-upgraded hand rows render level 1", async () => {
    const upgraded: HandStats = {
      ...defaultStats,
      "High Card": { chips: 15, multiplier: 2, level: 2 },
    };
    const user = userEvent.setup();
    render(<RunInfo handPlayCounts={buildCounts()} handStats={upgraded} />);
    await user.click(screen.getByRole("button", { name: "Run info" }));
    expect(screen.getByTestId("run-info-level-Pair")).toHaveTextContent("1");
  });

  test("leaves non-upgraded hand rows showing their baseline stats", async () => {
    const upgraded: HandStats = {
      ...defaultStats,
      "High Card": { chips: 15, multiplier: 2, level: 2 },
    };
    const user = userEvent.setup();
    render(<RunInfo handPlayCounts={buildCounts()} handStats={upgraded} />);
    await user.click(screen.getByRole("button", { name: "Run info" }));
    expect(screen.getByTestId("run-info-stats-Pair")).toHaveTextContent(
      `${defaultStats.Pair.chips} × ${defaultStats.Pair.multiplier}`,
    );
  });
});

describe("RunInfo dismissal", () => {
  test("pressing Escape closes the dialog", async () => {
    const user = userEvent.setup();
    render(<RunInfo handPlayCounts={buildCounts()} handStats={defaultStats} />);
    await user.click(screen.getByRole("button", { name: "Run info" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("clicking the Close button closes the dialog", async () => {
    const user = userEvent.setup();
    render(<RunInfo handPlayCounts={buildCounts()} handStats={defaultStats} />);
    await user.click(screen.getByRole("button", { name: "Run info" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("clicking the overlay backdrop closes the dialog", async () => {
    const user = userEvent.setup();
    render(<RunInfo handPlayCounts={buildCounts()} handStats={defaultStats} />);
    await user.click(screen.getByRole("button", { name: "Run info" }));
    await user.click(screen.getByRole("dialog"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("clicking inside the modal body does not close the dialog", async () => {
    const user = userEvent.setup();
    render(<RunInfo handPlayCounts={buildCounts()} handStats={defaultStats} />);
    await user.click(screen.getByRole("button", { name: "Run info" }));
    await user.click(screen.getByRole("heading", { name: "Run Information" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("a non-Escape global keydown does not close the dialog", async () => {
    const user = userEvent.setup();
    render(<RunInfo handPlayCounts={buildCounts()} handStats={defaultStats} />);
    await user.click(screen.getByRole("button", { name: "Run info" }));
    fireEvent.keyDown(window, { key: "a" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("emptyHandCounts", () => {
  test("initializes every HANDS label to 0", () => {
    const counts = emptyHandCounts();
    for (const hand of HANDS) {
      expect(counts[hand.label as HandLabel]).toBe(0);
    }
  });
});
