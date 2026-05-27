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

describe("Lucky proc visual indicator (#368)", () => {
  test("shows the lucky-mult-scoring testid on the scored Lucky card when the mult roll hits", async () => {
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
    expect(
      document.querySelector("[data-testid^='lucky-mult-scoring-']"),
    ).not.toBeNull();
  });

  test("shows the lucky-money-scoring testid on the scored Lucky card when the money roll hits", async () => {
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
    expect(
      document.querySelector("[data-testid^='lucky-money-scoring-']"),
    ).not.toBeNull();
  });

  test("renders no lucky indicators when both rolls miss (negative)", async () => {
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
    expect(
      document.querySelector(
        "[data-testid^='lucky-mult-scoring-'], [data-testid^='lucky-money-scoring-']",
      ),
    ).toBeNull();
  });

  test("renders no lucky indicators when the scored card is not Lucky (negative)", async () => {
    enhancementRngConfig.rng = () => 0;
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
    expect(
      document.querySelector(
        "[data-testid^='lucky-mult-scoring-'], [data-testid^='lucky-money-scoring-']",
      ),
    ).toBeNull();
  });
});
