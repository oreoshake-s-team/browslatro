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
  bossPickerRngConfig.rng = () => 0;
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

async function dismissBlindSelect(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  const btn = screen.queryByTestId("blind-select-play");
  if (btn) await user.click(btn);
}

describe("Boss Blinds — ante 1 (#245 phase 0)", () => {
  test("with rng=0 the picker lands on boss-default ('Boss Blind')", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByText(/Win/));
    expect(screen.getByText("Boss Blind")).toBeInTheDocument();
  });

  test("default boss yields a 2x required score (300 → 600)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByText(/Win/));
    expect(screen.getByText("Score at least: 600")).toBeInTheDocument();
  });
});

describe("Boss Blinds — ante 2 fresh-pool pick (#245 phase 0)", () => {
  async function advanceToAnte2BossBlind(
    user: ReturnType<typeof userEvent.setup>,
  ): Promise<void> {
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByText(/Win/));
  }

  test("with rng=0 the ante 2 picker lands on The Wall (first fresh)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToAnte2BossBlind(user);
    expect(screen.getByText("The Wall")).toBeInTheDocument();
    expect(getStatValue("Ante")).toHaveTextContent("2");
  });

  test("The Wall on ante 2 yields a 4x required score (800 → 3200)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToAnte2BossBlind(user);
    expect(screen.getByText("Score at least: 3200")).toBeInTheDocument();
  });
});

describe("Boss Blinds — Phase 1 effects (#245)", () => {
  function findBossById(id: string): () => number {
    return () => {
      const indexes: Record<string, number> = {
        "boss-default": 0,
        "the-wall": 1,
        "the-needle": 2,
        "the-water": 3,
        "the-manacle": 4,
        "the-psychic": 5,
        "the-tooth": 6,
      };
      const idx = indexes[id];
      const ante1Eligible = ["boss-default", "the-manacle", "the-psychic"];
      const i = ante1Eligible.indexOf(id);
      if (i >= 0) return i / ante1Eligible.length + 0.001;
      return idx / 6;
    };
  }

  async function advanceToBossBlindAfterStartingTheRound(
    user: ReturnType<typeof userEvent.setup>,
  ): Promise<void> {
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
  }

  test("The Manacle on ante 1 deals only 7 cards on blind 3", async () => {
    bossPickerRngConfig.rng = findBossById("the-manacle");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToBossBlindAfterStartingTheRound(user);
    expect(screen.getByText("The Manacle")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Your hand").querySelectorAll("button[aria-pressed]"),
    ).toHaveLength(7);
  });

  test("The Psychic on ante 1 disables Submit Hand until 5 cards are selected", async () => {
    bossPickerRngConfig.rng = findBossById("the-psychic");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToBossBlindAfterStartingTheRound(user);
    expect(screen.getByText("The Psychic")).toBeInTheDocument();
    expect(screen.getByText(/Submit Hand/)).toBeDisabled();
    const cards = Array.from(
      screen
        .getByLabelText("Your hand")
        .querySelectorAll("button[aria-pressed]"),
    );
    for (let i = 0; i < 5; i += 1) await user.click(cards[i] as HTMLElement);
    expect(screen.getByText(/Submit Hand/)).not.toBeDisabled();
  });

  function statByLabel(label: string): HTMLElement {
    return screen.getByText(label).parentElement as HTMLElement;
  }

  async function advanceToAnte2BossBlindStartedRound(
    user: ReturnType<typeof userEvent.setup>,
  ): Promise<void> {
    await dismissBlindSelect(user);
    for (let i = 0; i < 5; i += 1) {
      await user.click(screen.getByText(/Win/));
      await user.click(screen.getByRole("button", { name: /Next Round/ }));
      await dismissBlindSelect(user);
    }
  }

  test("The Needle on ante 2 starts the round with only 1 hand remaining", async () => {
    bossPickerRngConfig.rng = () => 0.21;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToAnte2BossBlindStartedRound(user);
    expect(screen.getByText("The Needle")).toBeInTheDocument();
    expect(statByLabel("Hands")).toHaveTextContent("1");
  });

  test("The Water on ante 2 starts the round with 0 discards remaining", async () => {
    bossPickerRngConfig.rng = () => 0.61;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToAnte2BossBlindStartedRound(user);
    expect(screen.getByText("The Water")).toBeInTheDocument();
    expect(statByLabel("Discards")).toHaveTextContent("0");
  });

  test("New game with no boss picks resets the picker back to ante 1", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText("New game"));
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByText(/Win/));
    expect(screen.getByText("Boss Blind")).toBeInTheDocument();
  });
});
