import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RunInfo, { emptyHandCounts, type HandPlayCounts } from "./RunInfo";
import { HANDS } from "../../constants";
import type { HandLabel } from "../../handEvaluator";
import { createDefaultHandStats, type HandStats } from "../../handStats";
import { VOUCHER_CATALOG, type Voucher } from "../../vouchers";

function findVoucher(id: Voucher["id"]): Voucher {
  const v = VOUCHER_CATALOG.find((entry) => entry.id === id);
  if (!v) throw new Error(`voucher fixture missing: ${id}`);
  return v;
}

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

describe("RunInfo tab control", () => {
  async function openWithVouchers(
    vouchers: ReadonlyArray<Voucher> = [],
  ): Promise<ReturnType<typeof userEvent.setup>> {
    const user = userEvent.setup();
    render(
      <RunInfo
        handPlayCounts={buildCounts()}
        handStats={defaultStats}
        ownedVouchers={vouchers}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Run info" }));
    return user;
  }

  test("renders a tablist with exactly two tabs", async () => {
    await openWithVouchers();
    const tablist = screen.getByRole("tablist");
    expect(within(tablist).getAllByRole("tab")).toHaveLength(2);
  });

  test("renders a Hands tab", async () => {
    await openWithVouchers();
    expect(screen.getByRole("tab", { name: "Hands" })).toBeInTheDocument();
  });

  test("renders a Vouchers tab", async () => {
    await openWithVouchers();
    expect(screen.getByRole("tab", { name: "Vouchers" })).toBeInTheDocument();
  });

  test("Hands tab is selected by default", async () => {
    await openWithVouchers();
    expect(screen.getByRole("tab", { name: "Hands" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("Vouchers tab is not selected by default", async () => {
    await openWithVouchers();
    expect(screen.getByRole("tab", { name: "Vouchers" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  test("clicking the Vouchers tab selects it", async () => {
    const user = await openWithVouchers();
    await user.click(screen.getByRole("tab", { name: "Vouchers" }));
    expect(screen.getByRole("tab", { name: "Vouchers" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("clicking the Vouchers tab hides the Hands panel content", async () => {
    const user = await openWithVouchers();
    await user.click(screen.getByRole("tab", { name: "Vouchers" }));
    const handsPanel = screen.getByRole("tab", { name: "Hands" }).getAttribute(
      "aria-controls",
    );
    expect(document.getElementById(handsPanel ?? "")).toHaveAttribute("hidden");
  });

  test("ArrowRight on the Hands tab moves selection to Vouchers", async () => {
    const user = await openWithVouchers();
    const handsTab = screen.getByRole("tab", { name: "Hands" });
    handsTab.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Vouchers" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("ArrowLeft on the Vouchers tab moves selection to Hands", async () => {
    const user = await openWithVouchers();
    await user.click(screen.getByRole("tab", { name: "Vouchers" }));
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Hands" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("Home key selects the first tab", async () => {
    const user = await openWithVouchers();
    await user.click(screen.getByRole("tab", { name: "Vouchers" }));
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Hands" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("End key selects the last tab", async () => {
    const user = await openWithVouchers();
    screen.getByRole("tab", { name: "Hands" }).focus();
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Vouchers" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("reopening the modal resets the active tab to Hands", async () => {
    const user = userEvent.setup();
    render(<RunInfo handPlayCounts={buildCounts()} handStats={defaultStats} />);
    await user.click(screen.getByRole("button", { name: "Run info" }));
    await user.click(screen.getByRole("tab", { name: "Vouchers" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Run info" }));
    expect(screen.getByRole("tab", { name: "Hands" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("each tab uses a roving tabindex (active = 0, inactive = -1)", async () => {
    await openWithVouchers();
    expect(screen.getByRole("tab", { name: "Hands" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(screen.getByRole("tab", { name: "Vouchers" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });
});

describe("RunInfo vouchers panel", () => {
  async function openVouchersPanel(
    vouchers: ReadonlyArray<Voucher>,
  ): Promise<void> {
    const user = userEvent.setup();
    render(
      <RunInfo
        handPlayCounts={buildCounts()}
        handStats={defaultStats}
        ownedVouchers={vouchers}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Run info" }));
    await user.click(screen.getByRole("tab", { name: "Vouchers" }));
  }

  test("renders the empty-state placeholder when no vouchers are owned", async () => {
    await openVouchersPanel([]);
    expect(screen.getByTestId("run-info-voucher-empty")).toBeInTheDocument();
  });

  test("the empty-state placeholder reads 'No vouchers purchased yet.'", async () => {
    await openVouchersPanel([]);
    expect(screen.getByTestId("run-info-voucher-empty")).toHaveTextContent(
      "No vouchers purchased yet.",
    );
  });

  test("does not render a voucher row when no vouchers are owned (negative)", async () => {
    await openVouchersPanel([]);
    expect(
      screen.queryByTestId("run-info-voucher-row-overstock"),
    ).not.toBeInTheDocument();
  });

  test("renders a row for each owned voucher", async () => {
    const overstock = findVoucher("overstock");
    await openVouchersPanel([overstock]);
    expect(
      screen.getByTestId("run-info-voucher-row-overstock"),
    ).toBeInTheDocument();
  });

  test("renders the voucher's name", async () => {
    const overstock = findVoucher("overstock");
    await openVouchersPanel([overstock]);
    expect(
      screen.getByTestId("run-info-voucher-row-overstock"),
    ).toHaveTextContent(overstock.name);
  });

  test("renders the voucher's description", async () => {
    const overstock = findVoucher("overstock");
    await openVouchersPanel([overstock]);
    expect(
      screen.getByTestId("run-info-voucher-row-overstock"),
    ).toHaveTextContent(overstock.description);
  });

  test("does not render a voucher the player has not purchased (negative)", async () => {
    await openVouchersPanel([findVoucher("overstock")]);
    expect(
      screen.queryByTestId("run-info-voucher-row-crystal-ball"),
    ).not.toBeInTheDocument();
  });

  test("hides the empty-state when at least one voucher is owned (negative)", async () => {
    await openVouchersPanel([findVoucher("overstock")]);
    expect(
      screen.queryByTestId("run-info-voucher-empty"),
    ).not.toBeInTheDocument();
  });
});
