import type { MockedFunction } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { play } from "./components/system/sounds";
import { bossPickerRngConfig } from "./items/bosses";

vi.mock("./components/system/sounds", () => ({ play: vi.fn() }));

const playMock = play as MockedFunction<typeof play>;

import App from "./App";
import { useGame } from "./store/game";

beforeEach(() => {
  playMock.mockClear();
  bossPickerRngConfig.rng = () => 0;
  useGame.getState().setPendingRunSelect(false);
  useGame.getState().setSelectedDeck("red-deck");
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  act(() => {
    vi.runOnlyPendingTimers();
  });
  vi.useRealTimers();
  bossPickerRngConfig.rng = Math.random;
  useGame.getState().setSelectedDeck("red-deck");
});

function statByLabel(label: string): HTMLElement {
  return screen.getByText(label).parentElement as HTMLElement;
}

async function dismissBlindSelect(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  const btn = await screen.findByTestId("blind-select-play");
  await user.click(btn);
}

describe("Red Deck — +1 discard per round (#562)", () => {
  test("starting Small Blind with Red Deck shows 4 discards (base 3 + deck 1)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    expect(statByLabel("Discards")).toHaveTextContent("4");
  });

  test("negative: starting Small Blind with Yellow Deck shows 3 discards (no deck delta)", async () => {
    useGame.getState().setSelectedDeck("yellow-deck");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    expect(statByLabel("Discards")).toHaveTextContent("3");
  });
});
