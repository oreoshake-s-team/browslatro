import type { MockedFunction } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { play } from "./components/system/sounds";
import {
  getAnimationSpeed,
  setAnimationSpeed,
} from "./components/system/preferences";
import type { AnimationSpeed } from "./components/system/preferences";
import type { Card } from "./cards/types";
import { bossPickerRngConfig } from "./items/bosses";

vi.mock("./components/system/sounds", () => ({ play: vi.fn() }));

const playMock = play as MockedFunction<typeof play>;

let deckIdCounter = 0;
function makeCard(rank: Card["rank"], suit: Card["suit"]): Card {
  deckIdCounter += 1;
  return { id: deckIdCounter, rank, suit };
}

vi.mock("./cards/deck", async () => {
  const actual = await vi.importActual<typeof import("./cards/deck")>(
    "./cards/deck",
  );
  return {
    ...actual,
    shuffle: <T,>(items: ReadonlyArray<T>): T[] => items.slice(),
    createDeck: (): ReadonlyArray<Card> => {
      deckIdCounter = 0;
      const hand: ReadonlyArray<Card> = [
        makeCard("A", "spades"),
        makeCard("A", "hearts"),
        makeCard("5", "clubs"),
        makeCard("7", "diamonds"),
        makeCard("9", "spades"),
        makeCard("2", "hearts"),
        makeCard("3", "hearts"),
        makeCard("4", "hearts"),
      ];
      const rest: Card[] = [];
      for (let i = 0; i < 40; i += 1) rest.push(makeCard("2", "clubs"));
      return [...hand, ...rest];
    },
  };
});

import App from "./App";

let priorSpeed: AnimationSpeed = "normal";

beforeEach(() => {
  bossPickerRngConfig.rng = () => 0;
  priorSpeed = getAnimationSpeed();
  playMock.mockClear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  act(() => {
    vi.runOnlyPendingTimers();
  });
  vi.useRealTimers();
  setAnimationSpeed(priorSpeed);
  bossPickerRngConfig.rng = Math.random;
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

async function playPairOfAces(): Promise<void> {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<App />);
  await dismissBlindSelect(user);
  const cards = getHandCardButtons();
  await user.click(cards[0]);
  await user.click(cards[1]);
  await user.click(screen.getByText(/Submit Hand/));
  flushScoringSequence();
}

describe("Scoring trace overlay on slow speed", () => {
  test("renders the trace region only when animation speed is slow", () => {
    setAnimationSpeed("slow");
    render(<App />);
    expect(screen.getByRole("log", { name: /Scoring trace/i })).toBeInTheDocument();
  });

  test("does not render the trace region on normal speed (negative)", () => {
    setAnimationSpeed("normal");
    render(<App />);
    expect(screen.queryByRole("log", { name: /Scoring trace/i })).toBeNull();
  });

  test("does not render the trace region on fast speed (negative)", () => {
    setAnimationSpeed("fast");
    render(<App />);
    expect(screen.queryByRole("log", { name: /Scoring trace/i })).toBeNull();
  });

  test("does not render the trace region on instant speed (negative)", () => {
    setAnimationSpeed("instant");
    render(<App />);
    expect(screen.queryByRole("log", { name: /Scoring trace/i })).toBeNull();
  });
});

describe("Rank-chip events on slow speed", () => {
  test("emits a +11 Chips event for the Ace of Spades when scoring a Pair of Aces", async () => {
    setAnimationSpeed("slow");
    await playPairOfAces();
    const log = screen.getByRole("log", { name: /Scoring trace/i });
    expect(log).toHaveTextContent("+11 Chips (A♠ rank)");
  });

  test("emits a +11 Chips event for the Ace of Hearts when scoring a Pair of Aces", async () => {
    setAnimationSpeed("slow");
    await playPairOfAces();
    const log = screen.getByRole("log", { name: /Scoring trace/i });
    expect(log).toHaveTextContent("+11 Chips (A♥ rank)");
  });

  test("renders a hand-group heading with the hand label and level", async () => {
    setAnimationSpeed("slow");
    await playPairOfAces();
    const heading = screen
      .getByRole("log", { name: /Scoring trace/i })
      .querySelector("h3");
    expect(heading).toHaveTextContent("Hand 1: Pair (Lv 1)");
  });

  test("renders the hand-base chips/mult line inside the group heading", async () => {
    setAnimationSpeed("slow");
    await playPairOfAces();
    const heading = screen
      .getByRole("log", { name: /Scoring trace/i })
      .querySelector("h3");
    expect(heading).toHaveTextContent("+10 Chips, +2 Mult");
  });

  test("emits one list item per scored card on a Pair of Aces", async () => {
    setAnimationSpeed("slow");
    await playPairOfAces();
    const items = screen
      .getByRole("log", { name: /Scoring trace/i })
      .querySelectorAll("li");
    expect(items).toHaveLength(2);
  });

  test("emits no events on normal speed (recorder inactive)", async () => {
    setAnimationSpeed("normal");
    await playPairOfAces();
    expect(screen.queryByRole("log", { name: /Scoring trace/i })).toBeNull();
  });

  test("keeps prior hand groups when a new hand is submitted within the same round", async () => {
    setAnimationSpeed("slow");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    const cards = getHandCardButtons();
    await user.click(cards[0]);
    await user.click(cards[1]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    const cardsAgain = getHandCardButtons();
    await user.click(cardsAgain[0]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    const sections = screen
      .getByRole("log", { name: /Scoring trace/i })
      .querySelectorAll("section");
    expect(sections).toHaveLength(2);
  });

  test("labels each hand group with its 1-based ordinal", async () => {
    setAnimationSpeed("slow");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    const cards = getHandCardButtons();
    await user.click(cards[0]);
    await user.click(cards[1]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    const cardsAgain = getHandCardButtons();
    await user.click(cardsAgain[0]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    const headings = screen
      .getByRole("log", { name: /Scoring trace/i })
      .querySelectorAll("h3");
    expect(headings[0]).toHaveTextContent(/Hand 1:/);
    expect(headings[1]).toHaveTextContent(/Hand 2:/);
  });
});
