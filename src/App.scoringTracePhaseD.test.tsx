import type { MockedFunction } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { play } from "./components/system/sounds";
import { bossPickerRngConfig } from "./items/bosses";
import type { Card } from "./cards/types";


const playMock = play as MockedFunction<typeof play>;

let deckIdCounter = 0;
function makeCard(
  rank: Card["rank"],
  suit: Card["suit"],
  extras: Partial<Pick<Card, "enhancement" | "seal">> = {},
): Card {
  deckIdCounter += 1;
  return { id: deckIdCounter, rank, suit, ...extras };
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
    .filter((btn) => btn.classList.contains("card-discarding"))
    .forEach((btn) => fireEvent.animationEnd(btn));
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

describe("Scoring trace — Gold Seal", () => {
  test("emits +$3 when a card with a gold seal scores", async () => {
    deckConfig.hand = [
      makeCard("A", "spades", { seal: "gold" }),
      makeCard("A", "hearts"),
      makeCard("5", "clubs"),
      makeCard("7", "diamonds"),
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
    expect(logText()).toContain("+$3 (Gold Seal on A♠)");
  });
});

describe("Scoring trace — Steel held in hand", () => {
  test("emits ×1.5 Mult for a Steel-enhanced card held in hand during scoring", async () => {
    deckConfig.hand = [
      makeCard("A", "spades"),
      makeCard("A", "hearts"),
      makeCard("5", "clubs"),
      makeCard("7", "diamonds"),
      makeCard("9", "spades"),
      makeCard("2", "hearts", { enhancement: "steel" }),
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
    expect(logText()).toContain("×1.5 Mult (Steel: 2♥ held)");
  });
});

describe("Scoring trace — Red Seal retriggers held-in-hand (#762)", () => {
  test("emits a second ×1.5 Mult trace event for a Red-sealed held Steel card", async () => {
    deckConfig.hand = [
      makeCard("A", "spades"),
      makeCard("A", "hearts"),
      makeCard("5", "clubs"),
      makeCard("7", "diamonds"),
      makeCard("9", "spades"),
      makeCard("2", "hearts", { enhancement: "steel", seal: "red" }),
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
    const occurrences = logText().split("×1.5 Mult (Steel: 2♥ held)").length - 1;
    expect(occurrences).toBe(2);
  });

  test("emits two Gold-held money events for a Red-sealed held Gold card (winning Royal Flush)", async () => {
    deckConfig.hand = [
      makeCard("2", "hearts", { enhancement: "gold", seal: "red" }),
      makeCard("10", "spades"),
      makeCard("J", "spades"),
      makeCard("Q", "spades"),
      makeCard("K", "spades"),
      makeCard("A", "spades"),
      makeCard("3", "hearts"),
      makeCard("4", "hearts"),
    ];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    const cards = getHandCardButtons();
    for (let i = 0; i < cards.length; i += 1) {
      const label = cards[i].getAttribute("aria-label") ?? "";
      if (label.includes("of Spades")) await user.click(cards[i]);
    }
    await user.click(screen.getByText(/Submit Hand/));
    flushScoringSequence();
    const occurrences =
      logText().split("+$3 (Gold enhancement: 2♥ held)").length - 1;
    expect(occurrences).toBe(2);
  });

  test("a plain held Gold (no Red Seal) emits exactly one Gold-held money event (regression)", async () => {
    deckConfig.hand = [
      makeCard("2", "hearts", { enhancement: "gold" }),
      makeCard("10", "spades"),
      makeCard("J", "spades"),
      makeCard("Q", "spades"),
      makeCard("K", "spades"),
      makeCard("A", "spades"),
      makeCard("3", "hearts"),
      makeCard("4", "hearts"),
    ];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    const cards = getHandCardButtons();
    for (let i = 0; i < cards.length; i += 1) {
      const label = cards[i].getAttribute("aria-label") ?? "";
      if (label.includes("of Spades")) await user.click(cards[i]);
    }
    await user.click(screen.getByText(/Submit Hand/));
    flushScoringSequence();
    const occurrences =
      logText().split("+$3 (Gold enhancement: 2♥ held)").length - 1;
    expect(occurrences).toBe(1);
  });
});

describe("Scoring trace — round payout events", () => {
  test("emits the Small Blind reward after winning the round", async () => {
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
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/^Win$/));
    expect(logText()).toContain("+$3 (Small Blind reward)");
  });
});

describe("Scoring trace — no event when none applies (negative)", () => {
  test("emits no Gold Seal event for a card with no seal", async () => {
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
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    const cards = getHandCardButtons();
    await user.click(cards[0]);
    await user.click(cards[1]);
    await user.click(screen.getByText(/Submit Hand/));
    flushScoringSequence();
    flushDiscardAnimation();
    expect(logText()).not.toContain("Gold Seal");
  });

  test("emits no Steel event when no Steel cards are in hand", async () => {
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
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    const cards = getHandCardButtons();
    await user.click(cards[0]);
    await user.click(cards[1]);
    await user.click(screen.getByText(/Submit Hand/));
    flushScoringSequence();
    expect(logText()).not.toContain("Steel");
  });
});
