import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { setupAppTestEnvironment } from "./App.test-helpers";
import { useGame } from "./store/game";

setupAppTestEnvironment();

describe("Magic Deck — Crystal Ball + two Fools at run start", () => {
  test("confirming a Magic Deck run seeds the Crystal Ball voucher, two Fool tarots in the tray, and a third consumable slot", async () => {
    useGame.getState().setPendingRunSelect(true);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("new-run-deck-magic-deck"));
    await user.click(screen.getByTestId("new-run-confirm"));
    await user.click(await screen.findByTestId("blind-select-play"));

    const state = useGame.getState();
    expect(state.ownedVoucherIds.has("crystal-ball")).toBe(true);
    expect(
      state.consumables.map((c) => (c.kind === "tarot" ? c.card.id : c.kind)),
    ).toEqual(["the-fool", "the-fool"]);
    expect(
      document.querySelectorAll('[data-consumable-kind="tarot"]'),
    ).toHaveLength(2);
    expect(
      screen.getAllByRole("button", { name: "Empty consumable slot" }),
    ).toHaveLength(1);
  });

  test("negative: confirming a Red Deck run seeds no vouchers and no consumables", async () => {
    useGame.getState().setPendingRunSelect(true);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("new-run-deck-red-deck"));
    await user.click(screen.getByTestId("new-run-confirm"));
    await user.click(await screen.findByTestId("blind-select-play"));

    const state = useGame.getState();
    expect(state.ownedVoucherIds.size).toBe(0);
    expect(state.consumables).toHaveLength(0);
  });
});
