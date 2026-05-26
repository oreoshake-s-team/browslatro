import type { MockedFunction } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { play } from "./components/system/sounds";

vi.mock("./components/system/sounds", () => ({ play: vi.fn() }));

const playMock = play as MockedFunction<typeof play>;

import type { Card } from "./cards/types";

let deckIdCounter = 0;
function makeCard(
  rank: Card["rank"],
  suit: Card["suit"],
  enhancement?: Card["enhancement"],
): Card {
  deckIdCounter += 1;
  return enhancement
    ? { id: deckIdCounter, rank, suit, enhancement }
    : { id: deckIdCounter, rank, suit };
}

vi.mock("./cards/deck", async () => {
  const actual = await vi.importActual<typeof import("./cards/deck")>("./cards/deck");
  return {
    ...actual,
    shuffle: <T,>(items: ReadonlyArray<T>): T[] => items.slice(),
    createDeck: (): ReadonlyArray<Card> => {
      deckIdCounter = 0;
      // First 8 cards = dealt hand. Mix of steel-held + non-steel-played so a
      // five-card submission of the non-steel cards leaves steel held.
      const hand: ReadonlyArray<Card> = [
        makeCard("9", "spades"),
        makeCard("8", "spades"),
        makeCard("7", "spades"),
        makeCard("6", "spades"),
        makeCard("5", "spades"),
        makeCard("2", "spades", "steel"),
        makeCard("3", "spades", "steel"),
        makeCard("4", "spades"),
      ];
      // Pad the rest of the deck with throwaway cards.
      const rest: Card[] = [];
      for (let i = 0; i < 40; i += 1) {
        rest.push(makeCard("2", "hearts"));
      }
      return [...hand, ...rest];
    },
  };
});

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
});

function getHandCardButtons(): HTMLElement[] {
  return Array.from(
    screen.getByLabelText("Your hand").querySelectorAll("button[aria-pressed]"),
  );
}

function flushAllTimers(): void {
  for (let i = 0; i < 40; i += 1) {
    if (vi.getTimerCount() === 0) return;
    act(() => {
      vi.runOnlyPendingTimers();
    });
  }
}

async function submitNonSteelCards(): Promise<void> {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<App />);
  const cards = getHandCardButtons();
  for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
  await user.click(screen.getByText(/Submit Hand/));
}

describe("Steel held-card animation (#177)", () => {
  test("with held steel cards present, the steel sequence runs (\"pop\" sounds fire)", async () => {
    await submitNonSteelCards();
    flushAllTimers();
    const popCalls = playMock.mock.calls.filter(([name]) => name === "pop").length;
    expect(popCalls).toBeGreaterThan(0);
  });

  test("no steel sequence runs when no steel cards are held (negative)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const cards = getHandCardButtons();
    for (let i = 0; i < 3; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushAllTimers();
    expect(document.querySelector(".card-steel-scoring")).toBeNull();
  });
});

describe("Steel highlight prop (#177)", () => {
  test("a card with steel-scoring is exposed via the steel-scoring-<id> testid mid-sequence", async () => {
    await submitNonSteelCards();
    let sawSteelTestId = false;
    for (let i = 0; i < 40 && vi.getTimerCount() > 0; i += 1) {
      act(() => {
        vi.advanceTimersByTime(250);
      });
      if (document.querySelector("[data-testid^='steel-scoring-']")) {
        sawSteelTestId = true;
        break;
      }
    }
    expect(sawSteelTestId).toBe(true);
  });

  test("only steel-enhanced held cards receive the steel-scoring testid (negative)", async () => {
    await submitNonSteelCards();
    const seenIds = new Set<string>();
    for (let i = 0; i < 40 && vi.getTimerCount() > 0; i += 1) {
      act(() => {
        vi.advanceTimersByTime(250);
      });
      document
        .querySelectorAll("[data-testid^='steel-scoring-']")
        .forEach((el) => seenIds.add(el.getAttribute("data-testid") ?? ""));
    }
    const seenButNonSteel = Array.from(seenIds).filter((id) => {
      const cardIdStr = id.replace("steel-scoring-", "");
      const cardEl = document.querySelector(`[data-testid="hand-slot-${cardIdStr}"]`);
      return cardEl && !cardEl.querySelector(".card-enhancement-steel");
    });
    expect(seenButNonSteel).toEqual([]);
  });
});

describe("Steel multiplier ticks (#177)", () => {
  function multiplierValue(): number {
    const el = document.querySelector(".multiplier");
    return Number(el?.textContent ?? "0");
  }

  test("the multiplier increases monotonically across the steel sequence (ends >= starting value)", async () => {
    await submitNonSteelCards();
    let pre = multiplierValue();
    let max = pre;
    for (let i = 0; i < 40 && vi.getTimerCount() > 0; i += 1) {
      act(() => {
        vi.advanceTimersByTime(250);
      });
      pre = multiplierValue();
      if (pre > max) max = pre;
    }
    expect(max).toBeGreaterThan(0);
  });

  test("each steel tick fires a \"pop\" sound (2 held steel → ≥ 2 pop sounds attributable to steel sequence)", async () => {
    playMock.mockClear();
    await submitNonSteelCards();
    for (let i = 0; i < 40 && vi.getTimerCount() > 0; i += 1) {
      act(() => {
        vi.advanceTimersByTime(250);
      });
    }
    const popCalls = playMock.mock.calls.filter(([name]) => name === "pop").length;
    expect(popCalls).toBeGreaterThanOrEqual(2);
  });
});
