import type { MockedFunction } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { play } from "./components/system/sounds";
import { bossPickerRngConfig, createBossCatalog } from "./items/bosses";
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
});

function getHandCardButtons(): HTMLElement[] {
  return Array.from(
    screen.getByTestId("hand-cards").querySelectorAll("button[aria-pressed]"),
  );
}

function getStatValue(label: string): HTMLElement {
  return screen.getByText(label).parentElement as HTMLElement;
}

async function dismissBlindSelect(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  const btn = screen.queryByTestId("blind-select-play");
  if (btn) await user.click(btn);
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

describe("Submitting an all-debuffed selection on a Boss Blind (#264)", () => {
  test("submitting 5 debuffed clubs against The Club decrements the hands counter", async () => {
    deckConfig.hand = [
      makeCard("A", "clubs"),
      makeCard("K", "clubs"),
      makeCard("Q", "clubs"),
      makeCard("J", "clubs"),
      makeCard("9", "clubs"),
      makeCard("2", "hearts"),
      makeCard("3", "hearts"),
      makeCard("4", "hearts"),
    ];
    bossPickerRngConfig.rng = mkBossRng(["the-club"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToTheClubBossBlind(user);
    const handsBefore = Number(
      getStatValue("Hands").textContent?.replace(/[^0-9]/g, "") ?? "0",
    );
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    const handsAfter = Number(
      getStatValue("Hands").textContent?.replace(/[^0-9]/g, "") ?? "0",
    );
    expect(handsAfter).toBe(handsBefore - 1);
  });

  test("the played cards leave the hand after submitting an all-debuffed selection", async () => {
    deckConfig.hand = [
      makeCard("A", "clubs"),
      makeCard("K", "clubs"),
      makeCard("Q", "clubs"),
      makeCard("J", "clubs"),
      makeCard("9", "clubs"),
      makeCard("2", "hearts"),
      makeCard("3", "hearts"),
      makeCard("4", "hearts"),
    ];
    bossPickerRngConfig.rng = mkBossRng(["the-club"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToTheClubBossBlind(user);
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    const stillInHand = Array.from(
      document.querySelectorAll(
        '[data-testid="hand-cards"] button[aria-label*="of Clubs"]',
      ),
    );
    expect(stillInHand).toHaveLength(0);
  });

  test("submitting a non-debuffed selection still scores normally (negative regression)", async () => {
    deckConfig.hand = [
      makeCard("A", "hearts"),
      makeCard("A", "diamonds"),
      makeCard("5", "hearts"),
      makeCard("7", "hearts"),
      makeCard("9", "hearts"),
      makeCard("2", "hearts"),
      makeCard("3", "hearts"),
      makeCard("4", "hearts"),
    ];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    const handsBefore = Number(
      getStatValue("Hands").textContent?.replace(/[^0-9]/g, "") ?? "0",
    );
    const cards = getHandCardButtons();
    await user.click(cards[0]);
    await user.click(cards[1]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    const handsAfter = Number(
      getStatValue("Hands").textContent?.replace(/[^0-9]/g, "") ?? "0",
    );
    expect(handsAfter).toBe(handsBefore - 1);
  });
});
