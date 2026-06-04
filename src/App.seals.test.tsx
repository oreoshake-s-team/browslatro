import type { MockedFunction } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { play } from "./components/system/sounds";

vi.mock("./components/system/sounds", () => ({ play: vi.fn() }));

const playMock = play as MockedFunction<typeof play>;

import type { Card, Seal } from "./cards/types";

let deckIdCounter = 0;
function makeCard(
  rank: Card["rank"],
  suit: Card["suit"],
  seal?: Seal,
): Card {
  deckIdCounter += 1;
  return seal
    ? { id: deckIdCounter, rank, suit, seal }
    : { id: deckIdCounter, rank, suit };
}

const handFactoryRef: { build: () => ReadonlyArray<Card> } = {
  build: () => [],
};

vi.mock("./cards/deck", async () => {
  const actual = await vi.importActual<typeof import("./cards/deck")>("./cards/deck");
  return {
    ...actual,
    shuffle: <T,>(items: ReadonlyArray<T>): T[] => items.slice(),
    createDeck: (): ReadonlyArray<Card> => {
      deckIdCounter = 0;
      const hand = handFactoryRef.build();
      const rest: Card[] = [];
      for (let i = 0; i < 40; i += 1) {
        rest.push(makeCard("2", "hearts"));
      }
      return [...hand, ...rest];
    },
  };
});

import App from "./App";
import {
  createBusinessCardJoker,
  createJokerStencilJoker,
  createPlusFourMultJoker,
  initialJokersConfig,
} from "./items/jokers";

const originalJokersFactory = initialJokersConfig.factory;

beforeEach(() => {
  playMock.mockClear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  initialJokersConfig.factory = () => [
    createPlusFourMultJoker(),
    createBusinessCardJoker(),
    createJokerStencilJoker(),
  ];
});

afterEach(() => {
  act(() => {
    vi.runOnlyPendingTimers();
  });
  vi.useRealTimers();
  initialJokersConfig.factory = originalJokersFactory;
});

function getHandCardButtons(): HTMLElement[] {
  return Array.from(
    screen.getByLabelText("Your hand").querySelectorAll("button[aria-pressed]"),
  );
}

function flushAllTimers(): void {
  for (let i = 0; i < 60; i += 1) {
    if (vi.getTimerCount() === 0) return;
    act(() => {
      vi.runOnlyPendingTimers();
    });
  }
  getHandCardButtons()
    .filter((btn) => btn.classList.contains("card-discarding"))
    .forEach((btn) => {
      act(() => {
        btn.dispatchEvent(new Event("animationend", { bubbles: true }));
      });
    });
}

function moneyValue(): number {
  const el = screen
    .getByText("Money")
    .parentElement?.querySelector(".stat-value");
  return Number((el?.textContent ?? "$0").replace("$", ""));
}

function roundScoreValue(): number {
  const el = document.querySelector(".round-score-value");
  return Number(el?.textContent ?? "0");
}

function consumableCount(): number {
  return document.querySelectorAll('[data-testid^="consumable-tile-filled-"]')
    .length;
}

describe("Gold Seal — scoring effect (#208)", () => {
  test("playing a single Gold-seal high card pays exactly +$3 when scored", async () => {
    handFactoryRef.build = () => [
      makeCard("2", "spades", "gold"),
      makeCard("3", "hearts"),
      makeCard("4", "spades"),
      makeCard("5", "spades"),
      makeCard("6", "spades"),
      makeCard("7", "spades"),
      makeCard("8", "spades"),
      makeCard("9", "spades"),
    ];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const beforeMoney = moneyValue();
    const cards = getHandCardButtons();
    await user.click(cards[cards.length - 1]);
    await user.click(screen.getByText(/Submit Hand/));
    flushAllTimers();
    expect(moneyValue()).toBe(beforeMoney + 3);
  });

  test("playing a non-Gold-seal high card pays no seal bonus", async () => {
    handFactoryRef.build = () => [
      makeCard("2", "spades"),
      makeCard("3", "hearts"),
      makeCard("4", "spades"),
      makeCard("5", "spades"),
      makeCard("6", "spades"),
      makeCard("7", "spades"),
      makeCard("8", "spades"),
      makeCard("9", "spades"),
    ];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const beforeMoney = moneyValue();
    const cards = getHandCardButtons();
    await user.click(cards[cards.length - 1]);
    await user.click(screen.getByText(/Submit Hand/));
    flushAllTimers();
    expect(moneyValue()).toBe(beforeMoney);
  });
});

describe("Red Seal — retrigger (#208)", () => {
  test("a Red-seal high card retriggers — round score reflects 2×rank chips", async () => {
    handFactoryRef.build = () => [
      makeCard("2", "spades", "red"),
      makeCard("3", "hearts"),
      makeCard("4", "spades"),
      makeCard("5", "spades"),
      makeCard("6", "spades"),
      makeCard("7", "spades"),
      makeCard("8", "spades"),
      makeCard("9", "spades"),
    ];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const cards = getHandCardButtons();
    await user.click(cards[cards.length - 1]);
    await user.click(screen.getByText(/Submit Hand/));
    flushAllTimers();
    expect(roundScoreValue()).toBe(90);
  });

  test("a non-Red-seal high card scores rank chips once", async () => {
    handFactoryRef.build = () => [
      makeCard("2", "spades"),
      makeCard("3", "hearts"),
      makeCard("4", "spades"),
      makeCard("5", "spades"),
      makeCard("6", "spades"),
      makeCard("7", "spades"),
      makeCard("8", "spades"),
      makeCard("9", "spades"),
    ];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const cards = getHandCardButtons();
    await user.click(cards[cards.length - 1]);
    await user.click(screen.getByText(/Submit Hand/));
    flushAllTimers();
    expect(roundScoreValue()).toBe(70);
  });
});

describe("Blue Seal — held at end of round creates a Planet (#208)", () => {
  test("winning a round with a Blue-seal card held adds a planet consumable", async () => {
    handFactoryRef.build = () => [
      makeCard("A", "spades", "blue"),
      makeCard("A", "hearts"),
      makeCard("A", "diamonds"),
      makeCard("A", "clubs"),
      makeCard("2", "spades"),
      makeCard("3", "spades"),
      makeCard("4", "spades"),
      makeCard("5", "spades"),
    ];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const cards = getHandCardButtons();
    await user.click(cards[0]);
    await user.click(cards[1]);
    await user.click(cards[3]);
    await user.click(screen.getByText(/Submit Hand/));
    flushAllTimers();
    expect(consumableCount()).toBe(1);
  });

  test("losing a round with a Blue-seal card held does not add a consumable", async () => {
    handFactoryRef.build = () => [
      makeCard("A", "spades", "blue"),
      makeCard("3", "hearts"),
      makeCard("4", "spades"),
      makeCard("5", "spades"),
      makeCard("6", "spades"),
      makeCard("7", "spades"),
      makeCard("8", "spades"),
      makeCard("9", "spades"),
    ];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const beforeCount = consumableCount();
    const cards = getHandCardButtons();
    await user.click(cards[cards.length - 2]);
    await user.click(screen.getByText(/Submit Hand/));
    flushAllTimers();
    expect(consumableCount()).toBe(beforeCount);
  });
});

describe("Purple Seal — discard creates a Tarot (#208)", () => {
  test("discarding a Purple-seal card adds a tarot consumable", async () => {
    handFactoryRef.build = () => [
      makeCard("A", "spades", "purple"),
      makeCard("3", "hearts"),
      makeCard("4", "spades"),
      makeCard("5", "spades"),
      makeCard("6", "spades"),
      makeCard("7", "spades"),
      makeCard("8", "spades"),
      makeCard("9", "spades"),
    ];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const beforeCount = consumableCount();
    const cards = getHandCardButtons();
    await user.click(cards[0]);
    await user.click(screen.getByRole("button", { name: "Discard" }));
    flushAllTimers();
    expect(consumableCount()).toBe(beforeCount + 1);
  });

  test("discarding a non-purple card does not add a tarot (negative)", async () => {
    handFactoryRef.build = () => [
      makeCard("A", "spades"),
      makeCard("3", "hearts"),
      makeCard("4", "spades"),
      makeCard("5", "spades"),
      makeCard("6", "spades"),
      makeCard("7", "spades"),
      makeCard("8", "spades"),
      makeCard("9", "spades"),
    ];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const beforeCount = consumableCount();
    const cards = getHandCardButtons();
    await user.click(cards[0]);
    await user.click(screen.getByRole("button", { name: "Discard" }));
    flushAllTimers();
    expect(consumableCount()).toBe(beforeCount);
  });
});
