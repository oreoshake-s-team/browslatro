import { act, fireEvent, render, screen } from "@testing-library/react";
import { createBossCatalog } from "./items/bosses";
import { createPlusFourMultJoker } from "./items/jokers";
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
  vi.useRealTimers();
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

function flushDiscardAnimation(): void {
  flushScoringSequence();
  getHandCardButtons()
    .filter((btn) => btn.classList.contains("card--discarding"))
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

function findBoss(id: string): NonNullable<ReturnType<typeof useGame.getState>["currentBoss"]> {
  const boss = createBossCatalog().find((b) => b.id === id);
  if (!boss) throw new Error(`boss ${id} not found`);
  return boss;
}

function seedBossBlindAt(jokers: ReturnType<typeof useGame.getState>["jokers"]): void {
  const theClub = findBoss("the-club");
  act(() => {
    useGame.getState().setJokers(jokers);
    useGame.getState().setCurrentBoss(theClub);
    useGame.getState().setBlind(3);
  });
}

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

describe("hand-level joker bonuses apply when scoring.length === 0", () => {
  test("+4 Mult joker contributes to round score when all played cards are debuffed by The Club", () => {
    deckConfig.hand = CLUBS_FLUSH_HAND;
    render(<App />);
    seedBossBlindAt([createPlusFourMultJoker()]);
    submitFirstFive();
    expect(useGame.getState().roundScore).toBe(280);
  });

  test("round is won (not lost) when +4 Mult joker tips all-debuffed hand over required score on last hand", () => {
    deckConfig.hand = CLUBS_FLUSH_HAND;
    render(<App />);
    seedBossBlindAt([createPlusFourMultJoker()]);
    act(() => {
      useGame.getState().setRoundScore(321);
      useGame.getState().setRemainingHands(1);
    });
    submitFirstFive();
    expect(useGame.getState().pendingLose).toBeNull();
    expect(useGame.getState().pendingWin).not.toBeNull();
  });
});
