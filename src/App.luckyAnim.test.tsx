import type { MockedFunction } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { play } from "./components/system/sounds";
import {
  LUCKY_ENHANCEMENT_MONEY_AMOUNT,
  LUCKY_ENHANCEMENT_MULT_AMOUNT,
  enhancementRngConfig,
} from "./cards/enhancements";
import { bossPickerRngConfig } from "./items/bosses";
import { chanceOverrideConfig } from "./dev/chanceOverride";
import { useGame } from "./store/game";
import type { Card } from "./cards/types";


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
  chanceOverrideConfig.force100 = false;
});

function getHandCardButtons(): HTMLElement[] {
  return Array.from(
    screen.getByTestId("hand-cards").querySelectorAll("button[aria-pressed]"),
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

  test("a Lucky mult proc on a Three of a Kind contributes +20 Mult to the round score (#746)", async () => {
    enhancementRngConfig.rng = () => 0;
    deckConfig.hand = [
      makeCard("Q", "diamonds"),
      makeCard("Q", "spades"),
      makeCard("Q", "spades", "lucky"),
      makeCard("2", "clubs"),
      makeCard("3", "diamonds"),
      makeCard("4", "hearts"),
      makeCard("5", "spades"),
      makeCard("6", "clubs"),
    ];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    const cards = getHandCardButtons();
    await user.click(cards[0]);
    await user.click(cards[1]);
    await user.click(cards[2]);
    await user.click(screen.getByText(/Submit Hand/));
    flushScoringSequence();
    expect(useGame.getState().roundScore).toBe(1380);
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

describe("Lucky proc dual-fire on the same scoring event (#751)", () => {
  test("rng forced to 0 fires BOTH the mult proc and the money proc on the same Lucky card", async () => {
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
    const luckyCardId = document
      .querySelector("[data-testid^='lucky-mult-scoring-']")
      ?.getAttribute("data-testid")
      ?.replace("lucky-mult-scoring-", "");
    expect(
      document.querySelector(`[data-testid='lucky-money-scoring-${luckyCardId}']`),
    ).not.toBeNull();
  });

  test("rng forced to 0 emits both a Lucky mult-delta and a Lucky money-delta in the scoring trace", async () => {
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
    const events = useGame.getState().scoringEvents;
    const luckyMult = events.find(
      (e) =>
        e.kind === "mult-delta" &&
        e.source.startsWith("Lucky proc on"),
    );
    const luckyMoney = events.find(
      (e) =>
        e.kind === "money-delta" &&
        e.source.startsWith("Lucky money proc on"),
    );
    expect({
      hasMultEvent: luckyMult !== undefined,
      hasMoneyEvent: luckyMoney !== undefined,
    }).toEqual({ hasMultEvent: true, hasMoneyEvent: true });
  });

  test("rng forced to 0.999 fires neither proc and leaves money unchanged (negative)", async () => {
    enhancementRngConfig.rng = () => 0.999;
    const moneyBefore = useGame.getState().money;
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
    expect({
      mult: document.querySelector("[data-testid^='lucky-mult-scoring-']"),
      money: document.querySelector("[data-testid^='lucky-money-scoring-']"),
      moneyDelta: useGame.getState().money - moneyBefore,
    }).toEqual({ mult: null, money: null, moneyDelta: 0 });
  });
});

describe("Lucky proc with Force Probabilities dev modifier (#751)", () => {
  test("Force Probabilities makes every Lucky card in a played hand fire both procs", async () => {
    useGame.getState().setForceProbabilities(true);
    deckConfig.hand = [
      makeCard("A", "spades", "lucky"),
      makeCard("A", "hearts", "lucky"),
      makeCard("5", "clubs"),
      makeCard("7", "diamonds"),
      makeCard("9", "spades"),
      makeCard("2", "hearts"),
      makeCard("3", "hearts"),
      makeCard("4", "hearts"),
    ];
    await playFirstTwo();
    expect({
      mult: document.querySelectorAll("[data-testid^='lucky-mult-scoring-']")
        .length,
      money: document.querySelectorAll("[data-testid^='lucky-money-scoring-']")
        .length,
    }).toEqual({ mult: 2, money: 2 });
  });

  test("Force Probabilities pays out money for every Lucky card scored", async () => {
    useGame.getState().setForceProbabilities(true);
    deckConfig.hand = [
      makeCard("A", "spades", "lucky"),
      makeCard("A", "hearts", "lucky"),
      makeCard("5", "clubs"),
      makeCard("7", "diamonds"),
      makeCard("9", "spades"),
      makeCard("2", "hearts"),
      makeCard("3", "hearts"),
      makeCard("4", "hearts"),
    ];
    const moneyBefore = useGame.getState().money;
    await playFirstTwo();
    expect(useGame.getState().money - moneyBefore).toBeGreaterThanOrEqual(
      2 * LUCKY_ENHANCEMENT_MONEY_AMOUNT,
    );
  });

  test("Force Probabilities contributes every Lucky card's +Mult to roundScore (no silent drop)", async () => {
    useGame.getState().setForceProbabilities(true);
    deckConfig.hand = [
      makeCard("Q", "diamonds"),
      makeCard("Q", "spades"),
      makeCard("Q", "spades", "lucky"),
      makeCard("2", "clubs"),
      makeCard("3", "diamonds"),
      makeCard("4", "hearts"),
      makeCard("5", "spades"),
      makeCard("6", "clubs"),
    ];
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    const cards = getHandCardButtons();
    await user.click(cards[0]);
    await user.click(cards[1]);
    await user.click(cards[2]);
    await user.click(screen.getByText(/Submit Hand/));
    flushScoringSequence();
    const expectedMult = 3 + LUCKY_ENHANCEMENT_MULT_AMOUNT;
    const expectedChips = 30 + 30;
    expect(useGame.getState().roundScore).toBe(expectedChips * expectedMult);
  });
});
