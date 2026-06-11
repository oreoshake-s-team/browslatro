import type { MockedFunction } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { play } from "./components/system/sounds";
import { bossPickerRngConfig } from "./items/bosses";
import {
  RESERVED_PARKING_PAYOUT,
  createGreedyJoker,
  createPlusFourMultJoker,
  createReservedParkingJoker,
  initialJokersConfig,
} from "./items/jokers";
import type { Card } from "./cards/types";


const playMock = play as MockedFunction<typeof play>;

let deckIdCounter = 0;
function makeCard(rank: Card["rank"], suit: Card["suit"]): Card {
  deckIdCounter += 1;
  return { id: deckIdCounter, rank, suit };
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

const originalFactory = initialJokersConfig.factory;

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
  initialJokersConfig.factory = originalFactory;
});

function getHandCardButtons(): HTMLElement[] {
  return Array.from(
    screen.getByTestId("hand-cards").querySelectorAll("button[aria-pressed]"),
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

async function dismissBlindSelect(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  const btn = screen.queryByTestId("blind-select-play");
  if (btn) await user.click(btn);
}

function logText(): string {
  return screen.getByRole("log", { name: /Scoring trace/i }).textContent ?? "";
}

describe("Scoring trace — per-card joker events", () => {
  test("Greedy Joker emits +3 Mult labeled with the card when a Diamond scores", async () => {
    initialJokersConfig.factory = () => [createGreedyJoker()];
    deckConfig.hand = [
      makeCard("A", "diamonds"),
      makeCard("A", "hearts"),
      makeCard("5", "clubs"),
      makeCard("7", "spades"),
      makeCard("9", "spades"),
      makeCard("2", "hearts"),
      makeCard("3", "hearts"),
      makeCard("4", "hearts"),
    ];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    const cards = getHandCardButtons();
    await user.click(cards[0]);
    await user.click(cards[1]);
    await user.click(screen.getByText(/Submit Hand/));
    flushScoringSequence();
    expect(logText()).toContain("+3 Mult (Greedy Joker on A♦)");
  });

  test("Greedy Joker does not fire on a non-Diamond scored card (negative)", async () => {
    initialJokersConfig.factory = () => [createGreedyJoker()];
    deckConfig.hand = [
      makeCard("A", "spades"),
      makeCard("A", "hearts"),
      makeCard("5", "clubs"),
      makeCard("7", "spades"),
      makeCard("9", "spades"),
      makeCard("2", "hearts"),
      makeCard("3", "hearts"),
      makeCard("4", "hearts"),
    ];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    const cards = getHandCardButtons();
    await user.click(cards[0]);
    await user.click(cards[1]);
    await user.click(screen.getByText(/Submit Hand/));
    flushScoringSequence();
    expect(logText()).not.toContain("Greedy Joker on A♠");
  });
});

describe("Scoring trace — hand-level joker events", () => {
  test("+4 Mult Joker emits +4 Mult at the hand-level phase", async () => {
    initialJokersConfig.factory = () => [createPlusFourMultJoker()];
    deckConfig.hand = [
      makeCard("A", "spades"),
      makeCard("A", "hearts"),
      makeCard("5", "clubs"),
      makeCard("7", "spades"),
      makeCard("9", "spades"),
      makeCard("2", "hearts"),
      makeCard("3", "hearts"),
      makeCard("4", "hearts"),
    ];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    const cards = getHandCardButtons();
    await user.click(cards[0]);
    await user.click(cards[1]);
    await user.click(screen.getByText(/Submit Hand/));
    flushScoringSequence();
    expect(logText()).toContain("+4 Mult (+4 Mult)");
  });

  test("no hand-level joker events when no hand-level jokers are equipped (negative)", async () => {
    initialJokersConfig.factory = () => [createGreedyJoker()];
    deckConfig.hand = [
      makeCard("A", "spades"),
      makeCard("A", "hearts"),
      makeCard("5", "clubs"),
      makeCard("7", "spades"),
      makeCard("9", "spades"),
      makeCard("2", "hearts"),
      makeCard("3", "hearts"),
      makeCard("4", "hearts"),
    ];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    const cards = getHandCardButtons();
    await user.click(cards[0]);
    await user.click(cards[1]);
    await user.click(screen.getByText(/Submit Hand/));
    flushScoringSequence();
    expect(logText()).not.toContain("+4 Mult (+4 Mult)");
  });

  test("Reserved Parking emits +$1 in the scoring log per held face card that procs (regression for)", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      initialJokersConfig.factory = () => [createReservedParkingJoker()];
      deckConfig.hand = [
        makeCard("2", "clubs"),
        makeCard("2", "spades"),
        makeCard("J", "hearts"),
        makeCard("Q", "diamonds"),
        makeCard("K", "spades"),
        makeCard("3", "hearts"),
        makeCard("4", "hearts"),
        makeCard("5", "hearts"),
      ];
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);
      await dismissBlindSelect(user);
      const cards = getHandCardButtons();
      await user.click(cards[0]);
      await user.click(cards[1]);
      await user.click(screen.getByText(/Submit Hand/));
      flushScoringSequence();
      expect(logText()).toContain(
        `+$${RESERVED_PARKING_PAYOUT} (Reserved Parking)`,
      );
    } finally {
      randomSpy.mockRestore();
    }
  });

  test("Reserved Parking emits no money event when no held card procs (negative, regression for)", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0.99);
    try {
      initialJokersConfig.factory = () => [createReservedParkingJoker()];
      deckConfig.hand = [
        makeCard("2", "clubs"),
        makeCard("2", "spades"),
        makeCard("J", "hearts"),
        makeCard("Q", "diamonds"),
        makeCard("K", "spades"),
        makeCard("3", "hearts"),
        makeCard("4", "hearts"),
        makeCard("5", "hearts"),
      ];
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<App />);
      await dismissBlindSelect(user);
      const cards = getHandCardButtons();
      await user.click(cards[0]);
      await user.click(cards[1]);
      await user.click(screen.getByText(/Submit Hand/));
      flushScoringSequence();
      expect(logText()).not.toContain("Reserved Parking");
    } finally {
      randomSpy.mockRestore();
    }
  });
});
