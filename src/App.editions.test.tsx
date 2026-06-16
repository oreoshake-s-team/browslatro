import type { MockedFunction } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { play } from "./components/system/sounds";
import { bossPickerRngConfig } from "./items/bosses";
import { FOIL_CHIPS, POLYCHROME_X_MULT } from "./items/jokers";
import type { Card } from "./cards/types";

const playMock = play as MockedFunction<typeof play>;

let deckIdCounter = 0;
function makeCard(rank: Card["rank"], suit: Card["suit"]): Card {
  deckIdCounter += 1;
  return { id: deckIdCounter, rank, suit };
}

const deckConfig = { hand: [] as ReadonlyArray<Card> };

vi.mock("./cards/deck", async () => {
  const actual = await vi.importActual<typeof import("./cards/deck")>("./cards/deck");
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
import { useGame } from "./store/game";

beforeEach(() => {
  playMock.mockClear();
  bossPickerRngConfig.rng = () => 0;
  useGame.getState().setPendingRunSelect(false);
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

function flushDiscardAnimation(): void {
  for (let i = 0; i < 30; i += 1) {
    if (vi.getTimerCount() === 0) break;
    act(() => {
      vi.runOnlyPendingTimers();
    });
  }
  getHandCardButtons()
    .filter((btn) => btn.classList.contains("card--discarding"))
    .forEach((btn) => fireEvent.animationEnd(btn));
  for (let i = 0; i < 5; i += 1) {
    if (vi.getTimerCount() === 0) break;
    act(() => {
      vi.runOnlyPendingTimers();
    });
  }
}

async function scoreSingleHighCard(played: Card): Promise<number> {
  deckConfig.hand = [played];
  useGame.getState().resetGame();
  useGame.getState().setPendingRunSelect(false);
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const { unmount } = render(<App />);
  const blind = screen.queryByTestId("blind-select-play");
  if (blind) await user.click(blind);
  await user.click(getHandCardButtons()[0]);
  await user.click(screen.getByText(/Submit Hand/));
  flushDiscardAnimation();
  const score = useGame.getState().roundScore;
  unmount();
  return score;
}

describe("card editions contribute to the committed round score", () => {
  test("a foil card adds its chips to the score", async () => {
    const plain = await scoreSingleHighCard(makeCard("5", "clubs"));
    const foil = await scoreSingleHighCard({ ...makeCard("5", "clubs"), edition: "foil" });
    expect(foil - plain).toBe(FOIL_CHIPS);
  });

  test("a polychrome card multiplies the score", async () => {
    const plain = await scoreSingleHighCard(makeCard("5", "clubs"));
    const poly = await scoreSingleHighCard({ ...makeCard("5", "clubs"), edition: "polychrome" });
    expect(poly).toBe(Math.floor(plain * POLYCHROME_X_MULT));
  });
});
