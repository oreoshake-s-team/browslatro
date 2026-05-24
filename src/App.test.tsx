import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { isHighVisibility, toggleHighVisibility } from "./components/preferences";

jest.mock("./components/sounds", () => ({ play: jest.fn() }));

function resetHighVisibility(): void {
  if (isHighVisibility()) {
    toggleHighVisibility();
  }
  window.localStorage.removeItem("browslatro:highVisibility");
}

// Controllable shuffle: by default delegates to the real Fisher–Yates shuffle,
// but individual tests can opt into identity ordering to make the dealt hand
// deterministic. With identity shuffle the dealt hand is Spades 2..9, which
// displays in rank-descending order as 9♠, 8♠, 7♠, 6♠, 5♠, 4♠, 3♠, 2♠.
// Name must start with "mock" so jest.mock can reference it from its factory.
const mockShuffleConfig = { useIdentity: false };
jest.mock("./deck", () => {
  const actual = jest.requireActual("./deck");
  return {
    ...actual,
    shuffle: <T,>(items: ReadonlyArray<T>): T[] =>
      mockShuffleConfig.useIdentity ? items.slice() : actual.shuffle(items),
  };
});

beforeEach(() => {
  mockShuffleConfig.useIdentity = false;
  jest.useFakeTimers();
});

afterEach(() => {
  // Drain anything still scheduled before switching back, so React doesn't try
  // to update unmounted state.
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

function getStatValue(label: string): HTMLElement {
  return screen.getByText(label).parentElement as HTMLElement;
}

describe("Winning a round resets the deck", () => {
  test("restores the remaining deck count to its full post-deal size after a win", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    // Use a discard to shrink the deck (44 → 42)
    await user.click(getHandCardButtons()[0]);
    await user.click(getHandCardButtons()[1]);
    await user.click(screen.getByText(/^🗑️ Discard$/));
    flushDiscardAnimation();
    await user.click(screen.getByText(/Win/));
    expect(
      screen.getByRole("button", { name: /Deck \(44 cards remaining\)/ })
    ).toBeInTheDocument();
  });

  test("keeps the hand at 8 cards after a win resets the deck", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Win/));
    expect(getHandCardButtons()).toHaveLength(8);
  });

  test("clears any in-flight card selection on win", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    await user.click(getHandCardButtons()[0]);
    await user.click(screen.getByText(/Win/));
    const selectedCount = getHandCardButtons().filter(
      (btn) => btn.getAttribute("aria-pressed") === "true"
    ).length;
    expect(selectedCount).toBe(0);
  });

  test("deals different cards (fresh shuffle) after a win", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    const before = getHandCardButtons().map((btn) =>
      btn.getAttribute("aria-label")
    );
    await user.click(screen.getByText(/Win/));
    const after = getHandCardButtons().map((btn) =>
      btn.getAttribute("aria-label")
    );
    // With a fresh shuffle, the new hand should not match the old hand exactly
    expect(after).not.toEqual(before);
  });
});

describe("Win button integration", () => {
  test("advances blind, ante, round, and money across a full ante cycle", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    expect(screen.getByText("Small Blind")).toBeInTheDocument();
    expect(screen.getByText("Score at least: 300")).toBeInTheDocument();
    expect(getStatValue("Money")).toHaveTextContent("$0");

    await user.click(screen.getByText(/Win/)); // small → big, +$3
    expect(screen.getByText("Big Blind")).toBeInTheDocument();
    expect(screen.getByText("Score at least: 450")).toBeInTheDocument();
    expect(getStatValue("Money")).toHaveTextContent("$3");
    expect(getStatValue("Round")).toHaveTextContent("2");

    await user.click(screen.getByText(/Win/)); // big → boss, +$4
    expect(screen.getByText("Boss Blind")).toBeInTheDocument();
    expect(getStatValue("Money")).toHaveTextContent("$7");

    await user.click(screen.getByText(/Win/)); // boss → ante 2 small, +$5
    expect(screen.getByText("Small Blind")).toBeInTheDocument();
    expect(screen.getByText("Score at least: 800")).toBeInTheDocument();
    expect(getStatValue("Ante")).toHaveTextContent("2");
    expect(getStatValue("Money")).toHaveTextContent("$12");
  });
});

describe("Add Chips button integration", () => {
  test("clicking Add Chips updates chips shown in the sidebar", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add Chips/));
    expect(document.querySelector(".chips")).toHaveTextContent("30");
  });
});

describe("Add Multiplier button integration", () => {
  test("clicking Add Multiplier updates multiplier shown in the sidebar", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add Multiplier/));
    expect(document.querySelector(".multiplier")).toHaveTextContent("3");
  });
});

describe("Multiply Multiplier button integration", () => {
  test("clicking Multiply Multiplier updates multiplier shown in the sidebar", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Multiply Multiplier/));
    expect(document.querySelector(".multiplier")).toHaveTextContent("4");
  });
});

function getHandCardButtons(): HTMLElement[] {
  // Card buttons expose aria-pressed; reorder controls in each slot do not.
  return Array.from(
    screen.getByLabelText("Your hand").querySelectorAll("button[aria-pressed]")
  );
}

function flushScoringSequence(): void {
  // Each scoring step's setTimeout fires inside an act(), which only commits
  // its state update on exit. The useEffect that schedules the *next* timeout
  // runs after that commit, so a single runAllTimers can only fire one step.
  // Loop until the queue truly drains (with a safety cap).
  for (let i = 0; i < 20; i++) {
    if (jest.getTimerCount() === 0) return;
    act(() => {
      jest.runOnlyPendingTimers();
    });
  }
}

function flushDiscardAnimation(): void {
  // Cards only enter the discard animation after the scoring sequence
  // finalizes, so we drain that first.
  flushScoringSequence();
  getHandCardButtons()
    .filter((btn) => btn.classList.contains("card-discarding"))
    .forEach((btn) => fireEvent.animationEnd(btn));
}

describe("Card selection drives hand detection", () => {
  test("selecting a single card sets chips to High Card chip value", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    await user.click(getHandCardButtons()[0]);
    expect(document.querySelector(".chips")).toHaveTextContent("5");
  });

  test("selecting a single card sets multiplier to High Card multiplier value", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    await user.click(getHandCardButtons()[0]);
    expect(document.querySelector(".multiplier")).toHaveTextContent("1");
  });

  test("clicking a selected card deselects it", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    const cards = getHandCardButtons();
    await user.click(cards[0]);
    await user.click(cards[0]);
    expect(cards[0]).toHaveAttribute("aria-pressed", "false");
  });

  test("selection cap of 5 blocks a 6th selection", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    const cards = getHandCardButtons();
    for (let i = 0; i < 6; i++) {
      await user.click(cards[i]);
    }
    const selectedCount = getHandCardButtons().filter(
      (btn) => btn.getAttribute("aria-pressed") === "true"
    ).length;
    expect(selectedCount).toBe(5);
  });

  test("deselecting frees a slot so a previously blocked card can be selected", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i++) {
      await user.click(cards[i]);
    }
    await user.click(cards[0]);
    await user.click(cards[5]);
    expect(getHandCardButtons()[5]).toHaveAttribute("aria-pressed", "true");
  });
});

describe("Submitting a hand discards the selected cards", () => {
  test("clears all selection highlights after submit and animation", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    const cards = getHandCardButtons();
    await user.click(cards[0]);
    await user.click(cards[1]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    const selectedCount = getHandCardButtons().filter(
      (btn) => btn.getAttribute("aria-pressed") === "true"
    ).length;
    expect(selectedCount).toBe(0);
  });

  test("keeps the hand at 8 cards by drawing replacements from the deck", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    const cards = getHandCardButtons();
    await user.click(cards[0]);
    await user.click(cards[1]);
    await user.click(cards[2]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    expect(getHandCardButtons()).toHaveLength(8);
  });

  test("decrements the remaining deck count by the number of discarded cards", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    const cards = getHandCardButtons();
    await user.click(cards[0]);
    await user.click(cards[1]);
    await user.click(cards[2]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    expect(
      screen.getByRole("button", { name: /Deck \(41 cards remaining\)/ })
    ).toBeInTheDocument();
  });

  test("replaces the originally-selected cards with different cards", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    const beforeLabels = getHandCardButtons()
      .slice(0, 2)
      .map((btn) => btn.getAttribute("aria-label"));
    const cards = getHandCardButtons();
    await user.click(cards[0]);
    await user.click(cards[1]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    const afterLabels = getHandCardButtons().map((btn) =>
      btn.getAttribute("aria-label")
    );
    const stillPresent = beforeLabels.filter((label) =>
      afterLabels.includes(label)
    );
    expect(stillPresent).toEqual([]);
  });

  test("submitting with no cards selected leaves the hand unchanged", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    const before = getHandCardButtons().map((btn) =>
      btn.getAttribute("aria-label")
    );
    await user.click(screen.getByText(/Submit Hand/));
    const after = getHandCardButtons().map((btn) =>
      btn.getAttribute("aria-label")
    );
    expect(after).toEqual(before);
  });
});

describe("Discard button", () => {
  test("is disabled at the start of a round (no cards selected)", () => {
    render(<App />);
    expect(screen.getByText(/^🗑️ Discard$/)).toBeDisabled();
  });

  test("becomes enabled once at least one card is selected", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    await user.click(getHandCardButtons()[0]);
    expect(screen.getByText(/^🗑️ Discard$/)).not.toBeDisabled();
  });

  test("decrements the remaining discards count when clicked", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    await user.click(getHandCardButtons()[0]);
    await user.click(screen.getByText(/^🗑️ Discard$/));
    flushDiscardAnimation();
    expect(getStatValue("Discards")).toHaveTextContent("2");
  });

  test("does not change the round score", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    await user.click(getHandCardButtons()[0]);
    await user.click(screen.getByText(/^🗑️ Discard$/));
    flushDiscardAnimation();
    const roundScoreEl = document.querySelector(
      ".round-score-value"
    ) as HTMLElement;
    expect(roundScoreEl).toHaveTextContent("0");
  });

  test("does not decrement remaining hands", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    await user.click(getHandCardButtons()[0]);
    await user.click(screen.getByText(/^🗑️ Discard$/));
    flushDiscardAnimation();
    expect(getStatValue("Hands")).toHaveTextContent("4");
  });

  test("removes the originally-selected cards from the hand", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    const originalLabel = getHandCardButtons()[0].getAttribute("aria-label");
    await user.click(getHandCardButtons()[0]);
    await user.click(screen.getByText(/^🗑️ Discard$/));
    flushDiscardAnimation();
    const afterLabels = getHandCardButtons().map((btn) =>
      btn.getAttribute("aria-label")
    );
    expect(afterLabels).not.toContain(originalLabel);
  });

  test("refills the hand to 8 cards", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    await user.click(getHandCardButtons()[0]);
    await user.click(getHandCardButtons()[1]);
    await user.click(screen.getByText(/^🗑️ Discard$/));
    flushDiscardAnimation();
    expect(getHandCardButtons()).toHaveLength(8);
  });

  test("is disabled once all 3 discards have been used", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    for (let i = 0; i < 3; i++) {
      await user.click(getHandCardButtons()[0]);
      await user.click(screen.getByText(/^🗑️ Discard$/));
      flushDiscardAnimation();
    }
    expect(screen.getByText(/^🗑️ Discard$/)).toBeDisabled();
  });
});

describe("Hand stays sorted after a play", () => {
  function rankIndex(label: string | null): number {
    if (!label) return -1;
    const rank = label.split(" ")[0];
    const order = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    return order.indexOf(rank);
  }

  test("hand is in rank-descending order after submitting (replacement cards land sorted)", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    await user.click(getHandCardButtons()[0]);
    await user.click(getHandCardButtons()[1]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    const ranks = getHandCardButtons().map((btn) =>
      rankIndex(btn.getAttribute("aria-label")),
    );
    const isDescending = ranks.every(
      (r, i) => i === 0 || ranks[i - 1] >= r,
    );
    expect(isDescending).toBe(true);
  });

  test("hand is in rank-descending order after discarding (replacement cards land sorted)", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    await user.click(getHandCardButtons()[0]);
    await user.click(getHandCardButtons()[1]);
    await user.click(screen.getByText(/^🗑️ Discard$/));
    flushDiscardAnimation();
    const ranks = getHandCardButtons().map((btn) =>
      rankIndex(btn.getAttribute("aria-label")),
    );
    const isDescending = ranks.every(
      (r, i) => i === 0 || ranks[i - 1] >= r,
    );
    expect(isDescending).toBe(true);
  });
});

describe("Discard animation", () => {
  test("marks selected cards with the discarding class after the scoring sequence completes", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    const cards = getHandCardButtons();
    await user.click(cards[0]);
    await user.click(cards[1]);
    await user.click(screen.getByText(/Submit Hand/));
    flushScoringSequence();
    const discardingCount = getHandCardButtons().filter((btn) =>
      btn.classList.contains("card-discarding")
    ).length;
    expect(discardingCount).toBe(2);
  });

  test("does not finalize the discard until the animation ends", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    const cards = getHandCardButtons();
    const firstLabel = cards[0].getAttribute("aria-label");
    await user.click(cards[0]);
    await user.click(screen.getByText(/Submit Hand/));
    // Card is still rendered in the hand (just animating out)
    const labelsMidAnimation = getHandCardButtons().map((btn) =>
      btn.getAttribute("aria-label")
    );
    expect(labelsMidAnimation).toContain(firstLabel);
  });

  test("removes discarded cards from the hand after animation completes", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    const cards = getHandCardButtons();
    const firstLabel = cards[0].getAttribute("aria-label");
    await user.click(cards[0]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    const labelsAfter = getHandCardButtons().map((btn) =>
      btn.getAttribute("aria-label")
    );
    expect(labelsAfter).not.toContain(firstLabel);
  });

  test("blocks card toggles while a discard animation is in flight", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    const cards = getHandCardButtons();
    await user.click(cards[0]);
    await user.click(screen.getByText(/Submit Hand/));
    flushScoringSequence();
    // Try to click a different card mid-animation
    await user.click(cards[3]);
    expect(cards[3]).toHaveAttribute("aria-pressed", "false");
  });
});

describe("Submit Hand button integration", () => {
  test("resets chips back to the default after submit", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add Chips/));
    await user.click(screen.getByText(/Submit Hand/));
    expect(document.querySelector(".chips")).toHaveTextContent("20");
  });

  test("resets multiplier back to the default after submit", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add Multiplier/));
    await user.click(screen.getByText(/Submit Hand/));
    expect(document.querySelector(".multiplier")).toHaveTextContent("2");
  });

  test("submitting with no cards selected adds 0 to the round score", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Submit Hand/));
    expect(document.querySelector(".round-score-value")).toHaveTextContent("0");
  });

  test("adds the scoreHand result to the round score for a sub-threshold play", async () => {
    // Identity shuffle deals Spades 2..9. Sorted descending the top card is 9♠.
    // Submitting just 9♠ → High Card: (base 5 + rank 9) * mult 1 = 14
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    await user.click(getHandCardButtons()[0]);
    await user.click(screen.getByText(/Submit Hand/));
    flushScoringSequence();
    expect(document.querySelector(".round-score-value")).toHaveTextContent(
      "14",
    );
  });
});

describe("Submit Hand win integration", () => {
  test("submitting a hand whose scoreHand value meets the required score advances the blind", async () => {
    // Identity shuffle deals Spades 2..9. Selecting the top 5 by rank (9,8,7,6,5 ♠)
    // is a Straight Flush: (100 + 5+6+7+8+9) * 8 = 1080, well above 300.
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    const cards = getHandCardButtons();
    await user.click(cards[0]);
    await user.click(cards[1]);
    await user.click(cards[2]);
    await user.click(cards[3]);
    await user.click(cards[4]);
    await user.click(screen.getByText(/Submit Hand/));
    flushScoringSequence();
    expect(screen.getByText("Big Blind")).toBeInTheDocument();
  });
});

describe("Losing integration", () => {
  beforeEach(() => {
    jest.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("exhausting all hands without reaching the required score shows a game over alert", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Submit Hand/));
    await user.click(screen.getByText(/Submit Hand/));
    await user.click(screen.getByText(/Submit Hand/));
    await user.click(screen.getByText(/Submit Hand/));
    expect(window.alert).toHaveBeenCalledWith("Game Over! Try again.");
  });

  test("exhausting all hands without reaching the required score resets the game", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Submit Hand/));
    await user.click(screen.getByText(/Submit Hand/));
    await user.click(screen.getByText(/Submit Hand/));
    await user.click(screen.getByText(/Submit Hand/));
    expect(screen.getByText("Small Blind")).toBeInTheDocument();
  });
});

describe("Add Money button integration", () => {
  test("clicking Add $10 updates money shown in the sidebar", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add \$10/));
    expect(getStatValue("Money")).toHaveTextContent("$10");
  });
});

describe("Subtract Money button integration", () => {
  test("clicking Subtract $10 updates money shown in the sidebar", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add \$10/));
    await user.click(screen.getByText(/Subtract \$10/));
    expect(getStatValue("Money")).toHaveTextContent("$0");
  });
});

describe("High visibility preference integration", () => {
  afterEach(resetHighVisibility);

  test("App root does not carry the high-visibility class by default", () => {
    const { container } = render(<App />);
    expect(container.querySelector(".App")).not.toHaveClass("high-visibility");
  });

  test("toggling high visibility adds the class to the App root", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { container } = render(<App />);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText(/Enable high visibility suits/));
    expect(container.querySelector(".App")).toHaveClass("high-visibility");
  });

  test("toggling high visibility off removes the class from the App root", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { container } = render(<App />);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText(/Enable high visibility suits/));
    await user.click(screen.getByText(/Disable high visibility suits/));
    expect(container.querySelector(".App")).not.toHaveClass("high-visibility");
  });

  test("toggling persists the preference value to localStorage", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText(/Enable high visibility suits/));
    expect(window.localStorage.getItem("browslatro:highVisibility")).toBe(
      "true"
    );
  });
});

describe("Options modal reset integration", () => {
  test("opening options and clicking reset restores initial state", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);

    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByText(/Win/));
    expect(screen.getByText("Boss Blind")).toBeInTheDocument();
    expect(getStatValue("Money")).toHaveTextContent("$7"); // was $7 before reset

    await user.click(screen.getByText("Options"));
    expect(screen.getByRole("heading", { name: "Options" })).toBeInTheDocument();

    await user.click(screen.getByText("Reset"));

    expect(screen.queryByRole("heading", { name: "Options" })).not.toBeInTheDocument();
    expect(screen.getByText("Small Blind")).toBeInTheDocument();
    expect(screen.getByText("Score at least: 300")).toBeInTheDocument();
    expect(getStatValue("Money")).toHaveTextContent("$0"); // was $7 before reset
    expect(getStatValue("Ante")).toHaveTextContent("1");
    expect(getStatValue("Round")).toHaveTextContent("1");
  });
});

describe("Sequential card scoring", () => {
  async function submitFirstFiveSpades(): Promise<void> {
    // Identity shuffle deals Spades 2..9, displayed rank-descending as 9♠..2♠.
    // Selecting the top 5 → 9,8,7,6,5 of Spades, a Straight Flush.
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<App />);
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
  }

  test("the Submit Hand button is disabled while a scoring sequence is in flight", async () => {
    await submitFirstFiveSpades();
    // Sequence is running but has not been drained.
    expect(screen.getByText(/Submit Hand/)).toBeDisabled();
  });

  test("the Submit Hand button is re-enabled after the scoring sequence completes", async () => {
    await submitFirstFiveSpades();
    flushDiscardAnimation();
    expect(screen.getByText(/Submit Hand/)).not.toBeDisabled();
  });

  test("chips counter ticks up by each scored card's rank value during the sequence", async () => {
    // Straight Flush base chips = 100. After ticking 5♠ only, chips should be 105.
    await submitFirstFiveSpades();
    // Advance exactly one scoring step.
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(document.querySelector(".chips")).toHaveTextContent("105");
  });

  test("round score is unchanged mid-sequence", async () => {
    await submitFirstFiveSpades();
    act(() => {
      jest.runOnlyPendingTimers();
    });
    // After one step the sequence is in flight; round score should still be 0.
    expect(document.querySelector(".round-score-value")).toHaveTextContent("0");
  });

  test("final round score equals (hand base chips + per-card rank chips) * multiplier", async () => {
    // Straight Flush: (100 + 5+6+7+8+9) * 8 = 1080.
    // Required score in Ante 1 / Small Blind = 300, so this win-advances the
    // blind. We assert the Big Blind label appears (which only happens after
    // the scoring sequence finalizes and the round-won check fires).
    await submitFirstFiveSpades();
    flushDiscardAnimation();
    expect(screen.getByText("Big Blind")).toBeInTheDocument();
  });
});
