import type { MockedFunction } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { play } from "./components/system/sounds";
import { bossPickerRngConfig } from "./items/bosses";
import {
  PERISHABLE_LIFE,
  createBusinessCardJoker,
  initialJokersConfig,
  type Joker,
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

function perishedBusinessCard(): Joker {
  return {
    ...createBusinessCardJoker(),
    stickers: [{ kind: "perishable", roundsHeld: PERISHABLE_LIFE }],
  };
}

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

async function playPairOfJacks(): Promise<void> {
  deckConfig.hand = [
    makeCard("J", "hearts"),
    makeCard("J", "diamonds"),
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
}

describe("Perished Business Card joker (regression for)", () => {
  test("an active Business Card pays out on scored face cards", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      initialJokersConfig.factory = () => [createBusinessCardJoker()];
      await playPairOfJacks();
      expect(logText()).toContain("Business Card");
    } finally {
      randomSpy.mockRestore();
    }
  });

  test("a perished Business Card does not pay out on scored face cards", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      initialJokersConfig.factory = () => [perishedBusinessCard()];
      await playPairOfJacks();
      expect(logText()).not.toContain("Business Card");
    } finally {
      randomSpy.mockRestore();
    }
  });
});
