import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Hand from "./Hand";
import type { Card as CardType } from "../../cards/types";
import { createDeck as createGoldDeck } from "../../cards/deck";

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

function createDeck(): CardType[] {
  return createGoldDeck().map(({ rank, suit, id }) => ({ rank, suit, id }));
}

const deck = createDeck();
const stableHand = deck.slice(0, 8);
const stableRemaining = deck.slice(8);
const stableSelectedIds = new Set<number>();
const stableDiscardingIds = new Set<number>();
const noop = () => undefined;

function Harness({ children }: { children: (tick: number) => React.ReactNode }) {
  const [tick, setTick] = useState(0);
  return (
    <div>
      <button onClick={() => setTick((t) => t + 1)}>bump</button>
      {children(tick)}
    </div>
  );
}

async function bumpTwice(): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "bump" }));
  await user.click(screen.getByRole("button", { name: "bump" }));
}

describe("Hand memoization", () => {
  beforeEach(() => {
    useTranslationCalls.count = 0;
  });

  test("skips re-render when props are unchanged and an unrelated ancestor re-renders", async () => {
    render(
      <Harness>
        {() => (
          <Hand
            hand={stableHand}
            remaining={stableRemaining}
            selectedIds={stableSelectedIds}
            discardingIds={stableDiscardingIds}
            onToggleCard={noop}
            onCardDiscardEnd={noop}
          />
        )}
      </Harness>,
    );
    const rendersAfterMount = useTranslationCalls.count;
    await bumpTwice();
    expect(useTranslationCalls.count).toBe(rendersAfterMount);
  });
});
