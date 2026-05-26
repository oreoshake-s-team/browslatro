import type { MockedFunction } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { play } from "./components/system/sounds";
import { enhancementRngConfig } from "./cards/enhancements";
import { bossPickerRngConfig } from "./items/bosses";
import type { Card } from "./cards/types";

vi.mock("./components/system/sounds", () => ({ play: vi.fn() }));

const playMock = play as MockedFunction<typeof play>;

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

const deckConfig = {
  hand: [] as ReadonlyArray<Card>,
};

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
      for (let i = 0; i < 40; i += 1) rest.push(makeCard("2", "clubs"));
      return [...hand, ...rest];
    },
  };
});

import App from "./App";

const originalEnhancementRng = enhancementRngConfig.rng;

beforeEach(() => {
  bossPickerRngConfig.rng = () => 0;
  playMock.mockClear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  act(() => {
    vi.runOnlyPendingTimers();
  });
  vi.useRealTimers();
  bossPickerRngConfig.rng = Math.random;
  enhancementRngConfig.rng = originalEnhancementRng;
});

function getHandCardButtons(): HTMLElement[] {
  return Array.from(
    screen.getByLabelText("Your hand").querySelectorAll("button[aria-pressed]"),
  );
}

function flushScoringSequence(): void {
  for (let i = 0; i < 40; i += 1) {
    if (vi.getTimerCount() === 0) return;
    act(() => {
      vi.runOnlyPendingTimers();
    });
  }
}

async function dismissBlindSelect(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  const btn = screen.queryByTestId("blind-select-play");
  if (btn) await user.click(btn);
}

async function playFirstTwo(): Promise<void> {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<App />);
  await dismissBlindSelect(user);
  const cards = getHandCardButtons();
  await user.click(cards[0]);
  await user.click(cards[1]);
  await user.click(screen.getByText(/Submit Hand/));
  flushScoringSequence();
}

function logText(): string {
  return screen.getByRole("log", { name: /Scoring trace/i }).textContent ?? "";
}

describe("Scoring trace — enhancement events", () => {
  test("emits +30 Chips for a Bonus-enhanced scored card", async () => {
    deckConfig.hand = [
      makeCard("A", "spades", "bonus"),
      makeCard("A", "hearts"),
      makeCard("5", "clubs"),
      makeCard("7", "diamonds"),
      makeCard("9", "spades"),
      makeCard("2", "hearts"),
      makeCard("3", "hearts"),
      makeCard("4", "hearts"),
    ];
    await playFirstTwo();
    expect(logText()).toContain("+30 Chips (Bonus on A♠)");
  });

  test("emits +4 Mult for a Mult-enhanced scored card", async () => {
    deckConfig.hand = [
      makeCard("A", "spades", "mult"),
      makeCard("A", "hearts"),
      makeCard("5", "clubs"),
      makeCard("7", "diamonds"),
      makeCard("9", "spades"),
      makeCard("2", "hearts"),
      makeCard("3", "hearts"),
      makeCard("4", "hearts"),
    ];
    await playFirstTwo();
    expect(logText()).toContain("+4 Mult (Mult on A♠)");
  });

  test("emits ×2 Mult for a Glass-enhanced scored card (no destroy)", async () => {
    enhancementRngConfig.rng = () => 0.999;
    deckConfig.hand = [
      makeCard("A", "spades", "glass"),
      makeCard("A", "hearts"),
      makeCard("5", "clubs"),
      makeCard("7", "diamonds"),
      makeCard("9", "spades"),
      makeCard("2", "hearts"),
      makeCard("3", "hearts"),
      makeCard("4", "hearts"),
    ];
    await playFirstTwo();
    expect(logText()).toContain("×2 Mult (Glass on A♠)");
  });

  test("emits a card-destroyed event when a Glass card breaks", async () => {
    enhancementRngConfig.rng = () => 0;
    deckConfig.hand = [
      makeCard("A", "spades", "glass"),
      makeCard("A", "hearts"),
      makeCard("5", "clubs"),
      makeCard("7", "diamonds"),
      makeCard("9", "spades"),
      makeCard("2", "hearts"),
      makeCard("3", "hearts"),
      makeCard("4", "hearts"),
    ];
    await playFirstTwo();
    expect(logText()).toContain("A♠ destroyed (Glass roll)");
  });

  test("emits +50 Chips for a Stone-enhanced scored card", async () => {
    deckConfig.hand = [
      makeCard("A", "spades"),
      makeCard("A", "hearts"),
      makeCard("2", "clubs", "stone"),
      makeCard("7", "diamonds"),
      makeCard("9", "spades"),
      makeCard("2", "hearts"),
      makeCard("3", "hearts"),
      makeCard("4", "hearts"),
    ];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    await user.click(screen.getByRole("button", { name: /A of Spades/ }));
    await user.click(screen.getByRole("button", { name: /A of Hearts/ }));
    await user.click(screen.getByRole("button", { name: /Stone card/i }));
    await user.click(screen.getByText(/Submit Hand/));
    flushScoringSequence();
    expect(logText()).toContain("+50 Chips (Stone on 2♣)");
  });

  test("emits +20 Mult on a Lucky proc when the mult roll hits", async () => {
    enhancementRngConfig.rng = () => 0;
    deckConfig.hand = [
      makeCard("A", "spades", "lucky"),
      makeCard("A", "hearts"),
      makeCard("5", "clubs"),
      makeCard("7", "diamonds"),
      makeCard("9", "spades"),
      makeCard("2", "hearts"),
      makeCard("3", "hearts"),
      makeCard("4", "hearts"),
    ];
    await playFirstTwo();
    expect(logText()).toContain("+20 Mult (Lucky proc on A♠)");
  });

  test("emits +$20 on a Lucky money proc when the money roll hits", async () => {
    enhancementRngConfig.rng = () => 0;
    deckConfig.hand = [
      makeCard("A", "spades", "lucky"),
      makeCard("A", "hearts"),
      makeCard("5", "clubs"),
      makeCard("7", "diamonds"),
      makeCard("9", "spades"),
      makeCard("2", "hearts"),
      makeCard("3", "hearts"),
      makeCard("4", "hearts"),
    ];
    await playFirstTwo();
    expect(logText()).toContain("+$20 (Lucky money proc on A♠)");
  });

  test("emits no Lucky events when the rolls miss (negative)", async () => {
    enhancementRngConfig.rng = () => 0.999;
    deckConfig.hand = [
      makeCard("A", "spades", "lucky"),
      makeCard("A", "hearts"),
      makeCard("5", "clubs"),
      makeCard("7", "diamonds"),
      makeCard("9", "spades"),
      makeCard("2", "hearts"),
      makeCard("3", "hearts"),
      makeCard("4", "hearts"),
    ];
    await playFirstTwo();
    expect(logText()).not.toContain("Lucky");
  });

  test("emits no enhancement chip event for a plain (un-enhanced) Ace (negative)", async () => {
    deckConfig.hand = [
      makeCard("A", "spades"),
      makeCard("A", "hearts"),
      makeCard("5", "clubs"),
      makeCard("7", "diamonds"),
      makeCard("9", "spades"),
      makeCard("2", "hearts"),
      makeCard("3", "hearts"),
      makeCard("4", "hearts"),
    ];
    await playFirstTwo();
    expect(logText()).not.toContain("Bonus on A♠");
  });
});
