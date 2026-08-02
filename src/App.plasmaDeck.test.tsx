import { act, fireEvent, render, screen } from "@testing-library/react";
import { useGame } from "./store/game";
import type { Card } from "./cards/types";

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

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  act(() => {
    vi.runOnlyPendingTimers();
  });
  act(() => {
    useGame.getState().setSelectedDeck("red-deck");
  });
  vi.useRealTimers();
});

function getHandCardButtons(): HTMLElement[] {
  return Array.from(
    screen.getByTestId("hand-cards").querySelectorAll("button[aria-pressed]"),
  );
}

function flushScoringSequence(): void {
  for (let i = 0; i < 80; i += 1) {
    if (vi.getTimerCount() === 0) return;
    act(() => {
      vi.runOnlyPendingTimers();
    });
  }
}

function flushDiscardAnimation(): void {
  flushScoringSequence();
  getHandCardButtons()
    .filter((btn) => btn.hasAttribute("data-discarding"))
    .forEach((btn) => fireEvent.animationEnd(btn));
}

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

function submitFirstFive(): void {
  const hand = useGame.getState().dealt.hand;
  expect(hand.length).toBeGreaterThanOrEqual(5);
  act(() => {
    for (let i = 0; i < 5; i += 1) {
      useGame.getState().toggleCard(hand[i]);
    }
  });
  expect(useGame.getState().selectedIds.size).toBe(5);
  fireEvent.click(screen.getByText(/Submit Hand/));
  flushDiscardAnimation();
}

describe("Plasma Deck — balanced chips and mult", () => {
  test("a clubs Flush scores floor(((85+4)/2)^2) = 1980 with a balanced trace entry", () => {
    deckConfig.hand = CLUBS_FLUSH_HAND;
    render(<App />);
    act(() => {
      useGame.getState().setSelectedDeck("plasma-deck");
    });
    submitFirstFive();
    expect(useGame.getState().roundScore).toBe(1980);
    const balancedEvents = useGame
      .getState()
      .scoringEvents.filter((e) => e.kind === "score-balanced");
    expect(balancedEvents).toEqual([
      { kind: "score-balanced", balanced: 44.5, source: "Plasma Deck" },
    ]);
  });

  test("negative: the Red Deck scores the same Flush unbalanced at 85 x 4 = 340", () => {
    deckConfig.hand = CLUBS_FLUSH_HAND;
    render(<App />);
    submitFirstFive();
    expect(useGame.getState().roundScore).toBe(340);
    expect(
      useGame
        .getState()
        .scoringEvents.some((e) => e.kind === "score-balanced"),
    ).toBe(false);
  });
});
