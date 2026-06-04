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
  useGame.getState().setSelectedDeck("blue-deck");
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

describe("Blue Deck — +1 hand per round (#563)", () => {
  test("starting Small Blind with Blue Deck shows 5 hands (base 4 + deck 1)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    expect(statByLabel("Hands")).toHaveTextContent("5");
  });

  test("negative: starting Small Blind with Red Deck shows 4 hands (no hands delta)", async () => {
    useGame.getState().setSelectedDeck("red-deck");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    expect(statByLabel("Hands")).toHaveTextContent("4");
  });
});
