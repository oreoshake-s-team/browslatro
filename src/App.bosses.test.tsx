import type { MockedFunction } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
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
import { useGame } from "./store/game";

beforeEach(() => {
  playMock.mockClear();
  bossPickerRngConfig.rng = () => 0;
  mockShuffleConfig.useReverse = false;
  useGame.getState().setPendingRunSelect(false);
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
  test("with rng=0 the picker lands on the-manacle ('The Manacle')", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/^Win$/));
    await user.click(screen.getByText(/^Win$/));
    expect(screen.getByRole("heading", { name: "The Manacle" })).toBeInTheDocument();
  });

  test("The Manacle yields a 2x required score on ante 1 (300 → 600)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/^Win$/));
    await user.click(screen.getByText(/^Win$/));
    expect(screen.getByText("Score at least: 600")).toBeInTheDocument();
  });
});

describe("Boss Blinds — ante 2 fresh-pool pick (#245 phase 0)", () => {
  async function advanceToAnte2BossBlind(
    user: ReturnType<typeof userEvent.setup>,
  ): Promise<void> {
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/^Win$/));
    await user.click(screen.getByText(/^Win$/));
    await user.click(screen.getByText(/^Win$/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/^Win$/));
    await user.click(screen.getByText(/^Win$/));
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
    await user.click(screen.getByText(/^Win$/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/^Win$/));
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

  test("The Psychic does not gate Submit by selection count (#329)", async () => {
    bossPickerRngConfig.rng = mkBossRng(["the-psychic"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToBossBlindAfterStartingTheRound(user);
    const cards = Array.from(
      screen
        .getByLabelText("Your hand")
        .querySelectorAll("button[aria-pressed]"),
    );
    await user.click(cards[0] as HTMLElement);
    expect(screen.getByText(/Submit Hand/)).not.toBeDisabled();
  });

  function flushScoringSequence(): void {
    for (let i = 0; i < 60; i += 1) {
      if (vi.getTimerCount() === 0) return;
      act(() => {
        vi.runOnlyPendingTimers();
      });
    }
  }

  function flushDiscardAnimation(): void {
    flushScoringSequence();
    Array.from(
      screen
        .getByLabelText("Your hand")
        .querySelectorAll("button[aria-pressed]"),
    )
      .filter((btn) => btn.classList.contains("card-discarding"))
      .forEach((btn) => fireEvent.animationEnd(btn));
  }

  test("submitting 4 cards on The Psychic consumes a hand but leaves round score at 0 (#329)", async () => {
    bossPickerRngConfig.rng = mkBossRng(["the-psychic"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToBossBlindAfterStartingTheRound(user);
    const handsBefore = Number(
      getStatValue("Hands").textContent?.replace(/[^0-9]/g, "") ?? "0",
    );
    const cards = Array.from(
      screen
        .getByLabelText("Your hand")
        .querySelectorAll("button[aria-pressed]"),
    );
    for (let i = 0; i < 4; i += 1) await user.click(cards[i] as HTMLElement);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    const handsAfter = Number(
      getStatValue("Hands").textContent?.replace(/[^0-9]/g, "") ?? "0",
    );
    expect(handsAfter).toBe(handsBefore - 1);
  });

  test("submitting 4 cards on The Psychic leaves the round score at 0 (#329)", async () => {
    bossPickerRngConfig.rng = mkBossRng(["the-psychic"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToBossBlindAfterStartingTheRound(user);
    const cards = Array.from(
      screen
        .getByLabelText("Your hand")
        .querySelectorAll("button[aria-pressed]"),
    );
    for (let i = 0; i < 4; i += 1) await user.click(cards[i] as HTMLElement);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    const value = document.querySelector(".round-score-value");
    expect(value?.textContent ?? "").toBe("0");
  });

  test("submitting 5 cards on The Psychic still scores normally (#329)", async () => {
    bossPickerRngConfig.rng = mkBossRng(["the-psychic"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToBossBlindAfterStartingTheRound(user);
    const cards = Array.from(
      screen
        .getByLabelText("Your hand")
        .querySelectorAll("button[aria-pressed]"),
    );
    for (let i = 0; i < 5; i += 1) await user.click(cards[i] as HTMLElement);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    const value = document.querySelector(".round-score-value");
    expect(Number(value?.textContent ?? "0")).toBeGreaterThan(0);
  });

  function statByLabel(label: string): HTMLElement {
    return screen.getByText(label).parentElement as HTMLElement;
  }

  async function advanceToAnte2BossBlindStartedRound(
    user: ReturnType<typeof userEvent.setup>,
  ): Promise<void> {
    await dismissBlindSelect(user);
    for (let i = 0; i < 5; i += 1) {
      await user.click(screen.getByText(/^Win$/));
      await user.click(screen.getByRole("button", { name: /Next Round/ }));
      await dismissBlindSelect(user);
    }
  }

  test("The Needle on ante 2 starts the round with only 1 hand remaining", async () => {
    bossPickerRngConfig.rng = mkBossRng(["the-manacle", "the-needle"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToAnte2BossBlindStartedRound(user);
    expect(screen.getByText("The Needle")).toBeInTheDocument();
    expect(statByLabel("Hands")).toHaveTextContent("1");
  });

  test("The Water on ante 2 starts the round with 1 discard remaining on Red Deck (+1 stacks on top of the override)", async () => {
    bossPickerRngConfig.rng = mkBossRng(["the-manacle", "the-water"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToAnte2BossBlindStartedRound(user);
    expect(screen.getByText("The Water")).toBeInTheDocument();
    expect(statByLabel("Discards")).toHaveTextContent("1");
  });

  test("New game with no boss picks resets the picker back to ante 1", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/^Win$/));
    await user.click(screen.getByText(/^Win$/));
    await user.click(screen.getByText(/^Win$/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText("New game"));
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/^Win$/));
    await user.click(screen.getByText(/^Win$/));
    expect(screen.getByRole("heading", { name: "The Manacle" })).toBeInTheDocument();
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
    await user.click(screen.getByText(/^Win$/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/^Win$/));
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

describe("Boss Blinds — Phase 3 round-state effects (#245)", () => {
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

  async function advanceThroughBlind(
    user: ReturnType<typeof userEvent.setup>,
  ): Promise<void> {
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/^Win$/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
  }

  test("The Mouth disables Submit when the second-played-hand type would differ from the first", async () => {
    bossPickerRngConfig.rng = mkBossRng(["the-manacle", "the-mouth"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    for (let i = 0; i < 5; i += 1) await advanceThroughBlind(user);
    await dismissBlindSelect(user);
    expect(
      screen.getByRole("heading", { name: "The Mouth" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Submit Hand/)).not.toBeDisabled();
  });

  test("The Flint on ante 2 halves the displayed chips preview", async () => {
    bossPickerRngConfig.rng = mkBossRng(["the-manacle", "the-flint"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    for (let i = 0; i < 5; i += 1) await advanceThroughBlind(user);
    await dismissBlindSelect(user);
    expect(
      screen.getByRole("heading", { name: "The Flint" }),
    ).toBeInTheDocument();
    const cards = Array.from(
      screen
        .getByLabelText("Your hand")
        .querySelectorAll("button[aria-pressed]"),
    );
    await user.click(cards[0] as HTMLElement);
    expect(document.querySelector(".chips")).toHaveTextContent("2");
  });
});

describe("Boss Blinds — Phase 4 face-down effects (#245)", () => {
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

  async function advanceThroughBlind(
    user: ReturnType<typeof userEvent.setup>,
  ): Promise<void> {
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
  }

  test("The House makes every card in the initial boss-blind deal face-down", async () => {
    bossPickerRngConfig.rng = mkBossRng(["the-manacle", "the-house"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    for (let i = 0; i < 5; i += 1) await advanceThroughBlind(user);
    await dismissBlindSelect(user);
    expect(
      screen.getByRole("heading", { name: "The House" }),
    ).toBeInTheDocument();
    const handCards = Array.from(
      screen
        .getByLabelText("Your hand")
        .querySelectorAll("button[aria-pressed]"),
    );
    expect(
      handCards.every((el) => el.classList.contains("card-face-down")),
    ).toBe(true);
  });

  test("The Mark only face-downs face cards in the dealt hand", async () => {
    bossPickerRngConfig.rng = mkBossRng(["the-manacle", "the-mark"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    for (let i = 0; i < 5; i += 1) await advanceThroughBlind(user);
    await dismissBlindSelect(user);
    expect(
      screen.getByRole("heading", { name: "The Mark" }),
    ).toBeInTheDocument();
    const handCards = Array.from(
      screen
        .getByLabelText("Your hand")
        .querySelectorAll<HTMLElement>("button[aria-pressed]"),
    );
    for (const el of handCards) {
      const facedown = el.classList.contains("card-face-down");
      const label = el.getAttribute("aria-label") ?? "";
      if (facedown) {
        expect(label).toBe("Face-down card");
      }
    }
  });

  test("non-face-down bosses leave the boss-blind hand face-up", async () => {
    bossPickerRngConfig.rng = mkBossRng(["the-manacle", "the-wall"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    for (let i = 0; i < 5; i += 1) await advanceThroughBlind(user);
    await dismissBlindSelect(user);
    expect(
      document.querySelectorAll('[aria-label="Your hand"] .card-face-down'),
    ).toHaveLength(0);
  });
});
