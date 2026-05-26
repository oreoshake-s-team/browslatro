import type { MockedFunction } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { play } from "./components/system/sounds";
import { bossPickerRngConfig, createBossCatalog } from "./items/bosses";

vi.mock("./components/system/sounds", () => ({ play: vi.fn() }));

const mockShuffleConfig = { useReverse: false };
vi.mock("./cards/deck", async () => {
  const actual = await vi.importActual<typeof import("./cards/deck")>("./cards/deck");
  return {
    ...actual,
    shuffle: <T,>(items: ReadonlyArray<T>): T[] =>
      mockShuffleConfig.useReverse ? items.slice().reverse() : actual.shuffle(items),
  };
});

const playMock = play as MockedFunction<typeof play>;

import App from "./App";

beforeEach(() => {
  playMock.mockClear();
  bossPickerRngConfig.rng = () => 0;
  mockShuffleConfig.useReverse = false;
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  act(() => {
    vi.runOnlyPendingTimers();
  });
  vi.useRealTimers();
  bossPickerRngConfig.rng = Math.random;
  mockShuffleConfig.useReverse = false;
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
  function mkBossRng(idsPerAnte: ReadonlyArray<string>): () => number {
    let callIdx = 0;
    const recent = new Set<string>();
    return () => {
      const id = idsPerAnte[callIdx];
      const ante = callIdx + 1;
      const eligible = createBossCatalog().filter((b) => ante >= b.anteMin);
      const fresh = eligible.filter((b) => !recent.has(b.id));
      const pool = fresh.length > 0 ? fresh : eligible;
      const idx = pool.findIndex((b) => b.id === id);
      if (idx < 0) {
        throw new Error(`${id} not in pool for ante ${ante}`);
      }
      callIdx += 1;
      recent.add(id);
      return idx / pool.length + 0.0001;
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
    bossPickerRngConfig.rng = mkBossRng(["the-manacle"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToBossBlindAfterStartingTheRound(user);
    expect(screen.getByText("The Manacle")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Your hand").querySelectorAll("button[aria-pressed]"),
    ).toHaveLength(7);
  });

  test("The Psychic on ante 1 disables Submit Hand until 5 cards are selected", async () => {
    bossPickerRngConfig.rng = mkBossRng(["the-psychic"]);
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
    bossPickerRngConfig.rng = mkBossRng(["boss-default", "the-needle"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToAnte2BossBlindStartedRound(user);
    expect(screen.getByText("The Needle")).toBeInTheDocument();
    expect(statByLabel("Hands")).toHaveTextContent("1");
  });

  test("The Water on ante 2 starts the round with 0 discards remaining", async () => {
    bossPickerRngConfig.rng = mkBossRng(["boss-default", "the-water"]);
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

describe("Boss Blinds — Phase 2 debuffs (#245)", () => {
  function mkBossRng(idsPerAnte: ReadonlyArray<string>): () => number {
    let callIdx = 0;
    const recent = new Set<string>();
    return () => {
      const id = idsPerAnte[callIdx];
      const ante = callIdx + 1;
      const eligible = createBossCatalog().filter((b) => ante >= b.anteMin);
      const fresh = eligible.filter((b) => !recent.has(b.id));
      const pool = fresh.length > 0 ? fresh : eligible;
      const idx = pool.findIndex((b) => b.id === id);
      if (idx < 0) {
        throw new Error(`${id} not in pool for ante ${ante}`);
      }
      callIdx += 1;
      recent.add(id);
      return idx / pool.length + 0.0001;
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

  test("The Club applies the debuff class to club cards in hand", async () => {
    mockShuffleConfig.useReverse = true;
    bossPickerRngConfig.rng = mkBossRng(["the-club"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToBossBlindAfterStartingTheRound(user);
    expect(screen.getByText("The Club")).toBeInTheDocument();
    expect(
      document.querySelectorAll(".card-suit-clubs.card-debuffed").length,
    ).toBeGreaterThan(0);
  });

  test("The Club does not debuff non-club cards in hand (negative)", async () => {
    mockShuffleConfig.useReverse = true;
    bossPickerRngConfig.rng = mkBossRng(["the-club"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToBossBlindAfterStartingTheRound(user);
    const nonClubDebuffed = Array.from(
      document.querySelectorAll(".card-debuffed"),
    ).filter((el) => !el.classList.contains("card-suit-clubs"));
    expect(nonClubDebuffed).toHaveLength(0);
  });

  test("debuffed cards are absent on blind 1 even when the round's boss is The Club", () => {
    bossPickerRngConfig.rng = mkBossRng(["the-club"]);
    render(<App />);
    expect(document.querySelectorAll(".card-debuffed")).toHaveLength(0);
  });

});
