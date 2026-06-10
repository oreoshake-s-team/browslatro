import type { MockedFunction } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { play } from "./components/system/sounds";
import { bossPickerRngConfig } from "./items/bosses";
import {
  createFourFingersJoker,
  initialJokersConfig,
} from "./items/jokers";
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

const originalFactory = initialJokersConfig.factory;

beforeEach(() => {
  playMock.mockClear();
  bossPickerRngConfig.rng = () => 0;
  initialJokersConfig.factory = () => [createFourFingersJoker()];
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

async function dismissBlindSelect(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  const btn = screen.queryByTestId("blind-select-play");
  if (btn) await user.click(btn);
}

describe("Four Fingers — 5-card hand with 4 same-suit (#832)", () => {
  test("5 cards (1 off-suit + 4 same-suit) is detected as Flush", async () => {
    deckConfig.hand = [
      makeCard("A", "hearts"),
      makeCard("J", "diamonds"),
      makeCard("9", "diamonds"),
      makeCard("7", "diamonds"),
      makeCard("5", "diamonds"),
      makeCard("4", "spades"),
      makeCard("3", "spades"),
      makeCard("2", "spades"),
    ];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    expect(screen.getByTestId("submit-hand-detected")).toHaveTextContent(
      "Flush",
    );
  });

  test("5 cards (3 same-suit + 2 other) stays High Card (negative)", async () => {
    deckConfig.hand = [
      makeCard("A", "hearts"),
      makeCard("K", "hearts"),
      makeCard("9", "diamonds"),
      makeCard("7", "diamonds"),
      makeCard("5", "diamonds"),
      makeCard("4", "spades"),
      makeCard("3", "spades"),
      makeCard("2", "spades"),
    ];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    expect(screen.getByTestId("submit-hand-detected")).toHaveTextContent(
      "High Card",
    );
  });
});
