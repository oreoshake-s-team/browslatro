import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { setupAppTestEnvironment } from "./App.test-helpers";
import { useGame } from "./store/game";

setupAppTestEnvironment();

describe("Zodiac Deck — merchant and Overstock vouchers at run start", () => {
  test("confirming a Zodiac Deck run seeds Tarot Merchant, Planet Merchant, and Overstock", async () => {
    useGame.getState().setPendingRunSelect(true);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("new-run-deck-zodiac-deck"));
    await user.click(screen.getByTestId("new-run-confirm"));
    await user.click(await screen.findByTestId("blind-select-play"));

    const owned = useGame.getState().ownedVoucherIds;
    expect([...owned].sort()).toEqual([
      "overstock",
      "planet-merchant",
      "tarot-merchant",
    ]);
  });
});
