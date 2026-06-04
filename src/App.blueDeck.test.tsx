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

describe("Blue Deck — +1 hand per round (#563)", () => {
  withDeck("blue-deck");

  test("starting Small Blind with Blue Deck shows 5 hands (base 4 + deck 1)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    expect(getStatValue("Hands")).toHaveTextContent("5");
  });

  test("negative: starting Small Blind with Red Deck shows 4 hands (no hands delta)", async () => {
    useGame.getState().setSelectedDeck("red-deck");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    expect(getStatValue("Hands")).toHaveTextContent("4");
  });
});
