import { useState } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JokersSection from "./JokersSection";
import { useGame } from "../../store/game";
import { createBusinessCardJoker, createGreedyJoker } from "../../items/jokers";

const useTranslationCalls = { count: 0 };

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: (...args: Parameters<typeof actual.useTranslation>) => {
      useTranslationCalls.count++;
      return actual.useTranslation(...args);
    },
  };
});

// Only JokerTile (not Jokers or JokersSection) calls this, so it's an
// unambiguous per-tile render canary independent of how many times the
// unmemoized Jokers wrapper itself re-executes.
const jokerTileRenderCalls = { count: 0 };

vi.mock("../jokers/useJokerDescriptionContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../jokers/useJokerDescriptionContext")>();
  return {
    ...actual,
    useJokerDescriptionContext: (...args: Parameters<typeof actual.useJokerDescriptionContext>) => {
      jokerTileRenderCalls.count++;
      return actual.useJokerDescriptionContext(...args);
    },
  };
});

function JokersSectionMemoHarness() {
  const [, setTick] = useState(0);
  return (
    <div>
      <button onClick={() => setTick((t) => t + 1)}>bump</button>
      <JokersSection />
    </div>
  );
}

beforeEach(() => {
  useGame.getState().resetGame();
  useTranslationCalls.count = 0;
  jokerTileRenderCalls.count = 0;
});

describe("JokersSection memoization", () => {
  test("skips re-render when an unrelated ancestor re-renders (zero own props)", async () => {
    render(<JokersSectionMemoHarness />);
    const rendersAfterMount = useTranslationCalls.count;
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "bump" }));
    await user.click(screen.getByRole("button", { name: "bump" }));
    expect(useTranslationCalls.count).toBe(rendersAfterMount);
  });

  test("a pulse update for one joker does not re-render the other joker's tile", () => {
    const jokerA = createBusinessCardJoker();
    const jokerB = createGreedyJoker();
    useGame.setState({ jokers: [jokerA, jokerB] });
    render(<JokersSection />);
    const tileRendersBeforePulse = jokerTileRenderCalls.count;

    act(() => {
      useGame.setState((s) => ({
        jokerPulseCounters: {
          ...s.jokerPulseCounters,
          [jokerA.id]: (s.jokerPulseCounters[jokerA.id] ?? 0) + 1,
        },
      }));
    });

    // Only jokerA's tile should re-render; a 2nd tile render would mean
    // jokerB's memoized JokerTile re-rendered too even though nothing about
    // it changed (its onSell/onMove callback props churned instead).
    expect(jokerTileRenderCalls.count - tileRendersBeforePulse).toBe(1);
  });
});
