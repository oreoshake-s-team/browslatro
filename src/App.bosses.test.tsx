import type { MockedFunction } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { play } from "./components/system/sounds";
import { bossPickerRngConfig, createBossCatalog } from "./items/bosses";
import { createPlusFourMultJoker } from "./items/jokers/factories";
import {
  createBusinessCardJoker,
  createJokerStencilJoker,
} from "./items/jokers";
import { emptyHandCounts } from "./components/hud/handPlayCounts";
import type { HandLabel } from "./scoring/handEvaluator";


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

describe("Boss Blinds — ante 1 (phase 0)", () => {
  test("with rng=0 the ante 1 picker lands on The Manacle (300 → 600 required score = 2x multiplier)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/^Win$/));
    await user.click(screen.getByText(/^Win$/));
    expect(screen.getByRole("heading", { name: "The Manacle" })).toBeInTheDocument();
    expect(screen.getByText("Score at least: 600")).toBeInTheDocument();
  });
});

describe("Boss Blinds — ante 2 fresh-pool pick (phase 0)", () => {
  async function advanceToAnte2BossBlind(
    user: ReturnType<typeof userEvent.setup>,
  ): Promise<void> {
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/^Win$/));
    await user.click(screen.getByText(/^Win$/));
    await user.click(screen.getByText(/^Win$/));
    await user.click(await screen.findByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/^Win$/));
    await user.click(screen.getByText(/^Win$/));
  }

  test("with rng=0 the ante 2 picker lands on The Wall on ante 2 (800 → 3200 required score = 4x multiplier)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToAnte2BossBlind(user);
    expect(screen.getByText("The Wall")).toBeInTheDocument();
    expect(getStatValue("Ante")).toHaveTextContent("2");
    expect(screen.getByText("Score at least: 3,200")).toBeInTheDocument();
  });
});

describe("Boss Blinds — Phase 1 effects", () => {
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
    await user.click(await screen.findByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/^Win$/));
    await user.click(await screen.findByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
  }

  test("The Manacle on ante 1 deals only 7 cards on blind 3", async () => {
    bossPickerRngConfig.rng = mkBossRng(["the-manacle"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToBossBlindAfterStartingTheRound(user);
    expect(screen.getByText("The Manacle")).toBeInTheDocument();
    expect(
      screen.getByTestId("hand-cards").querySelectorAll("button[aria-pressed]"),
    ).toHaveLength(7);
  });

  test("The Psychic does not gate Submit by selection count", async () => {
    bossPickerRngConfig.rng = mkBossRng(["the-psychic"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToBossBlindAfterStartingTheRound(user);
    const cards = Array.from(
      screen
        .getByTestId("hand-cards")
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
        .getByTestId("hand-cards")
        .querySelectorAll("button[aria-pressed]"),
    )
      .filter((btn) => btn.classList.contains("card--discarding"))
      .forEach((btn) => fireEvent.animationEnd(btn));
  }

  test("submitting 4 cards on The Psychic consumes a hand AND leaves round score at 0", async () => {
    bossPickerRngConfig.rng = mkBossRng(["the-psychic"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToBossBlindAfterStartingTheRound(user);
    const handsBefore = Number(
      getStatValue("Hands").textContent?.replace(/[^0-9]/g, "") ?? "0",
    );
    const cards = Array.from(
      screen
        .getByTestId("hand-cards")
        .querySelectorAll("button[aria-pressed]"),
    );
    for (let i = 0; i < 4; i += 1) await user.click(cards[i] as HTMLElement);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    const handsAfter = Number(
      getStatValue("Hands").textContent?.replace(/[^0-9]/g, "") ?? "0",
    );
    expect(handsAfter).toBe(handsBefore - 1);
    const value = document.querySelector(".round-score-value");
    expect(value?.textContent ?? "").toBe("0");
  });

  test("submitting 5 cards on The Psychic still scores normally", async () => {
    bossPickerRngConfig.rng = mkBossRng(["the-psychic"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToBossBlindAfterStartingTheRound(user);
    const cards = Array.from(
      screen
        .getByTestId("hand-cards")
        .querySelectorAll("button[aria-pressed]"),
    );
    for (let i = 0; i < 5; i += 1) await user.click(cards[i] as HTMLElement);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    const value = document.querySelector(".round-score-value");
    expect(
      Number(value?.textContent?.replace(/,/g, "") ?? "0"),
    ).toBeGreaterThan(0);
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
      await user.click(await screen.findByRole("button", { name: /Next Round/ }));
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
    await user.click(await screen.findByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText("New game"));
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/^Win$/));
    await user.click(screen.getByText(/^Win$/));
    expect(screen.getByRole("heading", { name: "The Manacle" })).toBeInTheDocument();
  });
});

describe("Boss Blinds — Phase 2 debuffs", () => {
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
    await user.click(await screen.findByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/^Win$/));
    await user.click(await screen.findByRole("button", { name: /Next Round/ }));
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
      document.querySelectorAll(".card-suit-clubs.card--debuffed").length,
    ).toBeGreaterThan(0);
  });

  test("The Club does not debuff non-club cards in hand (negative)", async () => {
    mockShuffleConfig.useReverse = true;
    bossPickerRngConfig.rng = mkBossRng(["the-club"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToBossBlindAfterStartingTheRound(user);
    const nonClubDebuffed = Array.from(
      document.querySelectorAll(".card--debuffed"),
    ).filter((el) => !el.classList.contains("card-suit-clubs"));
    expect(nonClubDebuffed).toHaveLength(0);
  });

  test("debuffed cards are absent on blind 1 even when the round's boss is The Club", () => {
    bossPickerRngConfig.rng = mkBossRng(["the-club"]);
    render(<App />);
    expect(document.querySelectorAll(".card--debuffed")).toHaveLength(0);
  });

});

describe("Boss Blinds — Phase 3 round-state effects", () => {
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
    await user.click(await screen.findByRole("button", { name: /Next Round/ }));
  }

  test("The Mouth keeps Submit enabled once a card is selected", async () => {
    bossPickerRngConfig.rng = mkBossRng(["the-manacle", "the-mouth"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    for (let i = 0; i < 5; i += 1) await advanceThroughBlind(user);
    await dismissBlindSelect(user);
    expect(
      screen.getByRole("heading", { name: "The Mouth" }),
    ).toBeInTheDocument();
    const cards = Array.from(
      screen.getByTestId("hand-cards").querySelectorAll("button[aria-pressed]"),
    );
    await user.click(cards[0] as HTMLElement);
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
        .getByTestId("hand-cards")
        .querySelectorAll("button[aria-pressed]"),
    );
    await user.click(cards[0] as HTMLElement);
    expect(document.querySelector(".chips")).toHaveTextContent("2");
  });
});

describe("Boss Blinds — Phase 4 face-down effects", () => {
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
    await user.click(await screen.findByRole("button", { name: /Next Round/ }));
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
        .getByTestId("hand-cards")
        .querySelectorAll("button[aria-pressed]"),
    );
    expect(
      handCards.every((el) => el.classList.contains("card--face-down")),
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
        .getByTestId("hand-cards")
        .querySelectorAll<HTMLElement>("button[aria-pressed]"),
    );
    for (const el of handCards) {
      const facedown = el.classList.contains("card--face-down");
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
      document.querySelectorAll('[data-testid="hand-cards"] .card--face-down'),
    ).toHaveLength(0);
  });
});

describe("Boss Blinds — Phase 5 The Hook", () => {
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
    await user.click(await screen.findByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/^Win$/));
    await user.click(await screen.findByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
  }

  function flushDiscardAnimation(): void {
    for (let i = 0; i < 60; i += 1) {
      if (vi.getTimerCount() === 0) break;
      act(() => {
        vi.runOnlyPendingTimers();
      });
    }
    Array.from(
      screen
        .getByTestId("hand-cards")
        .querySelectorAll("button[aria-pressed]"),
    )
      .filter((btn) => btn.classList.contains("card--discarding"))
      .forEach((btn) => fireEvent.animationEnd(btn));
  }

  test("playing a hand on The Hook removes 2 extra random held cards (deck shrinks by played + 2)", async () => {
    bossPickerRngConfig.rng = mkBossRng(["the-hook"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToBossBlindAfterStartingTheRound(user);
    expect(screen.getByRole("heading", { name: "The Hook" })).toBeInTheDocument();
    const dealtBefore = useGame.getState().dealt;
    const remainingBefore = dealtBefore.remaining.length;
    const cards = Array.from(
      screen
        .getByTestId("hand-cards")
        .querySelectorAll("button[aria-pressed]"),
    );
    await user.click(cards[0] as HTMLElement);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    flushDiscardAnimation();
    const remainingAfter = useGame.getState().dealt.remaining.length;
    expect(remainingBefore - remainingAfter).toBe(3);
  });

  test("The Hook does NOT decrement the discard counter when it fires", async () => {
    bossPickerRngConfig.rng = mkBossRng(["the-hook"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToBossBlindAfterStartingTheRound(user);
    const discardsBefore = useGame.getState().remainingDiscards;
    const cards = Array.from(
      screen
        .getByTestId("hand-cards")
        .querySelectorAll("button[aria-pressed]"),
    );
    await user.click(cards[0] as HTMLElement);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    flushDiscardAnimation();
    const discardsAfter = useGame.getState().remainingDiscards;
    expect(discardsAfter).toBe(discardsBefore);
  });

  test("The Hook displays its boss name in the boss-blind banner", async () => {
    bossPickerRngConfig.rng = mkBossRng(["the-hook"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToBossBlindAfterStartingTheRound(user);
    expect(screen.getByRole("heading", { name: "The Hook" })).toBeInTheDocument();
  });

  test("a non-Hook boss does NOT discard extra cards after a played hand (negative)", async () => {
    bossPickerRngConfig.rng = mkBossRng(["the-manacle"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToBossBlindAfterStartingTheRound(user);
    const remainingBefore = useGame.getState().dealt.remaining.length;
    const cards = Array.from(
      screen
        .getByTestId("hand-cards")
        .querySelectorAll("button[aria-pressed]"),
    );
    await user.click(cards[0] as HTMLElement);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    const remainingAfter = useGame.getState().dealt.remaining.length;
    expect(remainingBefore - remainingAfter).toBe(1);
  });

  test("The Hook picks its 2 discards from the pre-refill remainder, never from newly-drawn cards", async () => {
    bossPickerRngConfig.rng = mkBossRng(["the-hook"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToBossBlindAfterStartingTheRound(user);
    const dealtBefore = useGame.getState().dealt;
    const handBeforeIds = new Set(dealtBefore.hand.map((c) => c.id));
    const totalDraw = 3;
    const refillPoolIds = new Set(
      dealtBefore.remaining.slice(0, totalDraw).map((c) => c.id),
    );
    const cards = Array.from(
      screen
        .getByTestId("hand-cards")
        .querySelectorAll("button[aria-pressed]"),
    );
    await user.click(cards[0] as HTMLElement);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    flushDiscardAnimation();
    const handAfterIds = new Set(
      useGame.getState().dealt.hand.map((c) => c.id),
    );
    const droppedFromHand = Array.from(handBeforeIds).filter(
      (id) => !handAfterIds.has(id),
    );
    expect(droppedFromHand).toHaveLength(totalDraw);
    for (const id of droppedFromHand) {
      expect(refillPoolIds.has(id)).toBe(false);
    }
  });
});

describe("Boss Blinds — Phase 5 The Serpent", () => {
  function flushDiscardAnimation(): void {
    for (let i = 0; i < 60; i += 1) {
      if (vi.getTimerCount() === 0) break;
      act(() => {
        vi.runOnlyPendingTimers();
      });
    }
    Array.from(
      screen
        .getByTestId("hand-cards")
        .querySelectorAll("button[aria-pressed]"),
    )
      .filter((btn) => btn.classList.contains("card--discarding"))
      .forEach((btn) => fireEvent.animationEnd(btn));
  }

  test("playing a hand under The Serpent refills exactly 3 cards regardless of hand size", () => {
    const serpent = createBossCatalog().find((b) => b.id === "the-serpent")!;
    render(<App />);
    act(() => {
      useGame.getState().setAnte(5);
      useGame.getState().setBlind(3);
      useGame.getState().setCurrentBoss(serpent);
    });
    const handBeforeIds = useGame.getState().dealt.hand.map((c) => c.id);
    const cards = Array.from(
      screen
        .getByTestId("hand-cards")
        .querySelectorAll("button[aria-pressed]"),
    );
    fireEvent.click(cards[0] as HTMLElement);
    fireEvent.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    flushDiscardAnimation();
    const handAfterIds = useGame.getState().dealt.hand.map((c) => c.id);
    const dropped = handBeforeIds.filter((id) => !handAfterIds.includes(id));
    const added = handAfterIds.filter((id) => !handBeforeIds.includes(id));
    expect(dropped.length).toBe(1);
    expect(added.length).toBe(3);
  });

  test("a non-Serpent boss refills to hand-size as usual on the same setup (negative)", () => {
    const wall = createBossCatalog().find((b) => b.id === "the-wall")!;
    render(<App />);
    act(() => {
      useGame.getState().setAnte(5);
      useGame.getState().setBlind(3);
      useGame.getState().setCurrentBoss(wall);
    });
    const cards = Array.from(
      screen
        .getByTestId("hand-cards")
        .querySelectorAll("button[aria-pressed]"),
    );
    fireEvent.click(cards[0] as HTMLElement);
    fireEvent.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    expect(useGame.getState().dealt.hand.length).toBe(8);
  });
});

describe("Boss Blinds — Phase 5 The Ox", () => {
  function flushDiscardAnimation(): void {
    for (let i = 0; i < 60; i += 1) {
      if (vi.getTimerCount() === 0) break;
      act(() => {
        vi.runOnlyPendingTimers();
      });
    }
    Array.from(
      screen
        .getByTestId("hand-cards")
        .querySelectorAll("button[aria-pressed]"),
    )
      .filter((btn) => btn.classList.contains("card--discarding"))
      .forEach((btn) => fireEvent.animationEnd(btn));
  }

  function fullCounts(
    overrides: Partial<Record<HandLabel, number>>,
  ): Record<HandLabel, number> {
    return { ...emptyHandCounts(), ...overrides };
  }

  test("playing the most-played hand under The Ox sets money to $0 and traces the wipe", () => {
    const ox = createBossCatalog().find((b) => b.id === "the-ox")!;
    render(<App />);
    act(() => {
      useGame.getState().setAnte(6);
      useGame.getState().setBlind(3);
      useGame.getState().setCurrentBoss(ox);
      useGame.getState().setMoney(20);
      useGame.getState().setHandPlayCounts(fullCounts({ "High Card": 5 }));
    });
    const cards = Array.from(
      screen
        .getByTestId("hand-cards")
        .querySelectorAll("button[aria-pressed]"),
    );
    fireEvent.click(cards[0] as HTMLElement);
    fireEvent.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    expect(useGame.getState().money).toBe(0);
    const events = useGame.getState().scoringEvents;
    const oxTrace = events.find(
      (e) =>
        e.kind === "money-delta" &&
        (e.source === "The Ox" || e.source.includes("The Ox")),
    );
    expect(oxTrace).toBeDefined();
  });

  test("playing a non-most-played hand under The Ox leaves money untouched (negative)", () => {
    const ox = createBossCatalog().find((b) => b.id === "the-ox")!;
    render(<App />);
    act(() => {
      useGame.getState().setAnte(6);
      useGame.getState().setBlind(3);
      useGame.getState().setCurrentBoss(ox);
      useGame.getState().setMoney(20);
      useGame.getState().setHandPlayCounts(fullCounts({ Pair: 10 }));
    });
    const cards = Array.from(
      screen
        .getByTestId("hand-cards")
        .querySelectorAll("button[aria-pressed]"),
    );
    fireEvent.click(cards[0] as HTMLElement);
    fireEvent.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    expect(useGame.getState().money).toBe(20);
  });

  test("a non-Ox boss does NOT wipe the wallet on the most-played hand (negative)", () => {
    const wall = createBossCatalog().find((b) => b.id === "the-wall")!;
    render(<App />);
    act(() => {
      useGame.getState().setAnte(6);
      useGame.getState().setBlind(3);
      useGame.getState().setCurrentBoss(wall);
      useGame.getState().setMoney(20);
      useGame.getState().setHandPlayCounts(fullCounts({ "High Card": 5 }));
    });
    const cards = Array.from(
      screen
        .getByTestId("hand-cards")
        .querySelectorAll("button[aria-pressed]"),
    );
    fireEvent.click(cards[0] as HTMLElement);
    fireEvent.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    expect(useGame.getState().money).toBe(20);
  });
});

describe("Boss Blinds — showdown Verdant Leaf", () => {
  test("debuffs every card in hand until a Joker is sold", () => {
    const leaf = createBossCatalog().find((b) => b.id === "verdant-leaf")!;
    render(<App />);
    act(() => {
      useGame.getState().setAnte(8);
      useGame.getState().setBlind(3);
      useGame.getState().setCurrentBoss(leaf);
      useGame.getState().setJokers([createPlusFourMultJoker()]);
    });
    const debuffedBefore = document.querySelectorAll(
      '[data-testid="hand-cards"] .card--debuffed',
    );
    expect(debuffedBefore.length).toBeGreaterThan(0);
    act(() => {
      useGame.getState().sellJoker(0);
    });
    expect(
      document.querySelectorAll('[data-testid="hand-cards"] .card--debuffed'),
    ).toHaveLength(0);
  });

  test("leaves the hand undebuffed on a non-boss blind (negative)", () => {
    const leaf = createBossCatalog().find((b) => b.id === "verdant-leaf")!;
    render(<App />);
    act(() => {
      useGame.getState().setAnte(8);
      useGame.getState().setBlind(1);
      useGame.getState().setCurrentBoss(leaf);
    });
    expect(
      document.querySelectorAll('[data-testid="hand-cards"] .card--debuffed'),
    ).toHaveLength(0);
  });
});

describe("Boss Blinds — showdown Amber Acorn", () => {
  test("entering the boss round flips the Jokers face down and shuffles their order", async () => {
    const acorn = createBossCatalog().find((b) => b.id === "amber-acorn")!;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    mockShuffleConfig.useReverse = true;
    act(() => {
      useGame.getState().setAnte(8);
      useGame.getState().setCurrentBoss(acorn);
      useGame.getState().setJokers([
        createPlusFourMultJoker(),
        createBusinessCardJoker(),
        createJokerStencilJoker(),
      ]);
      useGame.getState().setBlind(3);
      useGame.getState().setPendingBlindSelect(true);
    });
    await user.click(screen.getByTestId("blind-select-play"));
    expect(screen.getAllByTestId("joker-tile-face-down")).toHaveLength(3);
    expect(useGame.getState().jokers.map((j) => j.id)).toEqual([
      "joker-stencil",
      "business-card",
      "plus-four-mult",
    ]);
  });

  test("a non-flip showdown boss leaves the Jokers face up (negative)", async () => {
    const vessel = createBossCatalog().find((b) => b.id === "violet-vessel")!;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    act(() => {
      useGame.getState().setAnte(8);
      useGame.getState().setCurrentBoss(vessel);
      useGame.getState().setJokers([createPlusFourMultJoker()]);
      useGame.getState().setBlind(3);
      useGame.getState().setPendingBlindSelect(true);
    });
    await user.click(screen.getByTestId("blind-select-play"));
    expect(
      screen.queryByTestId("joker-tile-face-down"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId("joker-tile-filled-plus-four-mult"),
    ).toBeInTheDocument();
  });
});

describe("Boss Blinds — showdown Crimson Heart", () => {
  function startCrimsonRound(bossId: string): void {
    const boss = createBossCatalog().find((b) => b.id === bossId)!;
    act(() => {
      useGame.getState().setAnte(8);
      useGame.getState().setCurrentBoss(boss);
      useGame.getState().setJokers([
        createPlusFourMultJoker(),
        createBusinessCardJoker(),
        createJokerStencilJoker(),
      ]);
      useGame.getState().setBlind(3);
      useGame.getState().setPendingBlindSelect(true);
    });
  }

  test("entering the boss round disables exactly one Joker", async () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    startCrimsonRound("crimson-heart");
    await user.click(screen.getByTestId("blind-select-play"));
    const disabled = document.querySelectorAll(
      '[data-testid="jokers-tray"] .joker-tile-debuffed',
    );
    expect(disabled).toHaveLength(1);
    expect(
      screen
        .getByTestId("joker-tile-filled-plus-four-mult")
        .getAttribute("data-debuffed"),
    ).toBe("true");
    random.mockRestore();
  });

  test("a non-disabling showdown boss leaves every Joker active (negative)", async () => {
    const vessel = "violet-vessel";
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    startCrimsonRound(vessel);
    await user.click(screen.getByTestId("blind-select-play"));
    expect(
      document.querySelectorAll(
        '[data-testid="jokers-tray"] .joker-tile-debuffed',
      ),
    ).toHaveLength(0);
  });

  test("the disable clears when the next round starts", async () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    startCrimsonRound("crimson-heart");
    await user.click(screen.getByTestId("blind-select-play"));
    expect(
      document.querySelectorAll(
        '[data-testid="jokers-tray"] .joker-tile-debuffed',
      ),
    ).toHaveLength(1);
    act(() => {
      useGame.getState().setBlind(1);
      useGame.getState().setPendingBlindSelect(true);
    });
    await user.click(screen.getByTestId("blind-select-play"));
    expect(
      document.querySelectorAll(
        '[data-testid="jokers-tray"] .joker-tile-debuffed',
      ),
    ).toHaveLength(0);
    random.mockRestore();
  });
});

describe("Boss Blinds — showdown Cerulean Bell", () => {
  function startBellRound(bossId: string): void {
    const boss = createBossCatalog().find((b) => b.id === bossId)!;
    act(() => {
      useGame.getState().setAnte(8);
      useGame.getState().setCurrentBoss(boss);
      useGame.getState().setBlind(3);
      useGame.getState().setPendingBlindSelect(true);
    });
  }

  test("entering the boss round forces exactly one card to be selected", async () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    startBellRound("cerulean-bell");
    await user.click(screen.getByTestId("blind-select-play"));
    await waitFor(() => {
      expect(document.querySelectorAll(".card--forced")).toHaveLength(1);
    });
    expect(useGame.getState().forcedCardId).not.toBeNull();
    expect(
      useGame.getState().selectedIds.has(useGame.getState().forcedCardId!),
    ).toBe(true);
    random.mockRestore();
  });

  test("clicking the forced card does not deselect it", async () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    startBellRound("cerulean-bell");
    await user.click(screen.getByTestId("blind-select-play"));
    await waitFor(() => {
      expect(document.querySelector(".card--forced")).not.toBeNull();
    });
    const forcedId = useGame.getState().forcedCardId!;
    await user.click(document.querySelector(".card--forced") as HTMLElement);
    expect(useGame.getState().selectedIds.has(forcedId)).toBe(true);
    expect(document.querySelectorAll(".card--forced")).toHaveLength(1);
    random.mockRestore();
  });

  test("a non-forcing showdown boss forces no card (negative)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    startBellRound("violet-vessel");
    await user.click(screen.getByTestId("blind-select-play"));
    expect(document.querySelectorAll(".card--forced")).toHaveLength(0);
    expect(useGame.getState().forcedCardId).toBeNull();
  });
});
