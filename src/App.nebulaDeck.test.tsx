import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { setupAppTestEnvironment } from "./App.test-helpers";
import { useGame } from "./store/game";

setupAppTestEnvironment();

describe("Nebula Deck — Telescope voucher and one fewer consumable slot", () => {
  test("confirming a Nebula Deck run seeds the Telescope voucher and shows a single consumable slot", async () => {
    useGame.getState().setPendingRunSelect(true);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("new-run-deck-nebula-deck"));
    await user.click(screen.getByTestId("new-run-confirm"));
    await user.click(await screen.findByTestId("blind-select-play"));

    expect(useGame.getState().ownedVoucherIds.has("telescope")).toBe(true);
    expect(
      screen.getAllByRole("button", { name: "Empty consumable slot" }),
    ).toHaveLength(1);
  });
});
