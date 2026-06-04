import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import {
  dismissBlindSelect,
  getStatValue,
  setupAppTestEnvironment,
  withDeck,
} from "./App.test-helpers";
import { useGame } from "./store/game";

setupAppTestEnvironment();

describe("Red Deck — +1 discard per round (#562)", () => {
  withDeck("red-deck");

  test("starting Small Blind with Red Deck shows 4 discards (base 3 + deck 1)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    expect(getStatValue("Discards")).toHaveTextContent("4");
  });

  test("negative: starting Small Blind with Yellow Deck shows 3 discards (no deck delta)", async () => {
    useGame.getState().setSelectedDeck("yellow-deck");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    expect(getStatValue("Discards")).toHaveTextContent("3");
  });
});
