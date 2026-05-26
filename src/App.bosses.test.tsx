import type { MockedFunction } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { play } from "./components/system/sounds";
import { bossPickerRngConfig } from "./items/bosses";

vi.mock("./components/system/sounds", () => ({ play: vi.fn() }));

const playMock = play as MockedFunction<typeof play>;

import App from "./App";

beforeEach(() => {
  playMock.mockClear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  act(() => {
    vi.runOnlyPendingTimers();
  });
  vi.useRealTimers();
  bossPickerRngConfig.rng = Math.random;
});

function getStatValue(label: string): HTMLElement {
  return screen.getByText(label).parentElement as HTMLElement;
}

describe("Boss Blinds — phase 0 infrastructure (#245)", () => {
  test("ante 1 boss is the default 'Boss Blind' (only eligible entry)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByText(/Win/));
    expect(screen.getByText("Boss Blind")).toBeInTheDocument();
  });

  test("ante 1 boss required score uses the default 2x multiplier (300 → 600)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByText(/Win/));
    expect(screen.getByText("Score at least: 600")).toBeInTheDocument();
  });

  test("ante 2 with rng=0.99 picks The Wall (last eligible boss)", async () => {
    bossPickerRngConfig.rng = () => 0.99;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByText(/Win/));
    expect(screen.getByText("The Wall")).toBeInTheDocument();
    expect(getStatValue("Ante")).toHaveTextContent("2");
  });

  test("The Wall on ante 2 yields a 4x required score (800 → 3200)", async () => {
    bossPickerRngConfig.rng = () => 0.99;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByText(/Win/));
    expect(screen.getByText("Score at least: 3200")).toBeInTheDocument();
  });

  test("New game re-rolls the boss back to ante-1 default", async () => {
    bossPickerRngConfig.rng = () => 0.99;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText("New game"));
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByText(/Win/));
    expect(screen.getByText("Boss Blind")).toBeInTheDocument();
  });
});
