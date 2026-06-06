import type { MockedFunction } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { play } from "./components/system/sounds";
import { bossPickerRngConfig, createBossCatalog } from "./items/bosses";
import { createPlusFourMultJoker, initialJokersConfig } from "./items/jokers";
import { useGame } from "./store/game";
import type { Card } from "./cards/types";

const playMock = play as MockedFunction<typeof play>;

let deckIdCounter = 0;
function makeCard(rank: Card["rank"], suit: Card["suit"]): Card {
  deckIdCounter += 1;
  return { id: deckIdCounter, rank, suit };
}

const deckConfig = { hand: [] as ReadonlyArray<Card> };

vi.mock("./cards/deck", async () => {
  const actual = await vi.importActual<typeof import("./cards/deck")>(
    "./cards/deck",
  );
  return {
    ...actual,
    shuffle: <T,>(items: ReadonlyArray<T>): T[] => items.slice(),
    createDeck: (): ReadonlyArray<Card> => {
      deckIdCounter = 0;
      const hand = deckConfig.hand.map((c) => ({ ...c, id: ++deckIdCounter }));
      const rest: Card[] = [];
      for (let i = 0; i < 40; i += 1) rest.push(makeCard("2", "hearts"));
      return [...hand, ...rest];
    },
  };
});

import App from "./App";

const originalJokersFactory = initialJokersConfig.factory;

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
    if (idx < 0) throw new Error(`${id} not in pool for ante ${ante}`);
    callIdx += 1;
    recent.add(id);
    return idx / pool.length + 0.0001;
  };
}

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
  initialJokersConfig.factory = originalJokersFactory;
});

function getHandCardButtons(): HTMLElement[] {
  return Array.from(
    screen.getByLabelText("Your hand").querySelectorAll("button[aria-pressed]"),
  );
}

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
  getHandCardButtons()
    .filter((btn) => btn.classList.contains("card-discarding"))
    .forEach((btn) => fireEvent.animationEnd(btn));
}

async function dismissBlindSelect(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  const btn = screen.queryByTestId("blind-select-play");
  if (btn) await user.click(btn);
}

async function advanceToTheClubBossBlind(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await dismissBlindSelect(user);
  await user.click(screen.getByText(/Win/));
  await screen.findByTestId("shop-money");
  await user.click(screen.getByRole("button", { name: /Next Round/ }));
  await dismissBlindSelect(user);
  await user.click(screen.getByText(/Win/));
  await user.click(screen.getByRole("button", { name: /Next Round/ }));
  await dismissBlindSelect(user);
}

// A♣ K♣ Q♣ J♣ 9♣ = Flush (35 chips × 4 mult base)
// All five clubs are debuffed by The Club → scoring.length === 0
const CLUBS_FLUSH_HAND: ReadonlyArray<Card> = [
  makeCard("A", "clubs"),
  makeCard("K", "clubs"),
  makeCard("Q", "clubs"),
  makeCard("J", "clubs"),
  makeCard("9", "clubs"),
  makeCard("2", "hearts"),
  makeCard("3", "hearts"),
  makeCard("4", "hearts"),
];

describe("Fix #788 — hand-level joker bonuses apply when scoring.length === 0", () => {
  test("+4 Mult joker contributes to round score when all played cards are debuffed by The Club", async () => {
    // Flush (35 chips × 4 mult) + +4 Mult joker → floor(35 × 8) = 280
    // Old bug: finalizeHandSubmission(35 * 4) → round score = 140
    initialJokersConfig.factory = () => [createPlusFourMultJoker()];
    deckConfig.hand = CLUBS_FLUSH_HAND;
    bossPickerRngConfig.rng = mkBossRng(["the-club"]);

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToTheClubBossBlind(user);

    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();

    expect(useGame.getState().roundScore).toBe(280);
  });

  test("round is won (not lost) when +4 Mult joker tips all-debuffed hand over required score on last hand (#788)", async () => {
    // Required for The Club at ante 1: 300 × 2 = 600
    // All-debuffed Flush score with +4 Mult: floor(35 × 8) = 280
    // Set roundScore = 321 so 321 + 280 = 601 ≥ 600 → win
    // Without the fix: 321 + floor(35 × 4) = 321 + 140 = 461 < 600 → loseGame()
    initialJokersConfig.factory = () => [createPlusFourMultJoker()];
    deckConfig.hand = CLUBS_FLUSH_HAND;
    bossPickerRngConfig.rng = mkBossRng(["the-club"]);

    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToTheClubBossBlind(user);

    act(() => {
      useGame.getState().setRoundScore(321);
      useGame.getState().setRemainingHands(1);
    });

    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();

    expect(alertSpy).not.toHaveBeenCalled();
    expect(useGame.getState().pendingWin).not.toBeNull();

    alertSpy.mockRestore();
  });
});
