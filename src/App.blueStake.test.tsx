import { act, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import {
  dismissBlindSelect,
  getStatValue,
  setupAppTestEnvironment,
} from "./App.test-helpers";
import { useGame } from "./store/game";

setupAppTestEnvironment();

describe("Blue Stake — -1 discard per round (#556)", () => {
  beforeEach(() => {
    useGame.getState().setSelectedDeck("yellow-deck");
  });
  afterEach(() => {
    act(() => {
      useGame.getState().setSelectedDeck("red-deck");
      useGame.getState().setSelectedStake("white");
    });
  });

  test("starting Small Blind with Blue Stake + Yellow Deck shows 2 discards (base 3 − 1)", async () => {
    useGame.getState().setSelectedStake("blue");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    expect(getStatValue("Discards")).toHaveTextContent("2");
  });

  test("negative: White Stake + Yellow Deck still shows 3 discards (no stake delta)", async () => {
    useGame.getState().setSelectedStake("white");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    expect(getStatValue("Discards")).toHaveTextContent("3");
  });

  test("Blue Stake stacks with Red Deck (+1) → 3 discards", async () => {
    useGame.getState().setSelectedDeck("red-deck");
    useGame.getState().setSelectedStake("blue");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    expect(getStatValue("Discards")).toHaveTextContent("3");
  });
});
