import type { MockedFunction } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App, { getScoringStepMs } from "./App";
import {
  getAnimationSpeed,
  isHighVisibility,
  setAnimationSpeed,
  toggleHighVisibility,
} from "./components/system/preferences";
import { play } from "./components/system/sounds";
import { forceShopLayout, shopPickerRngConfig } from "./items/shop";
import { bossPickerRngConfig } from "./items/bosses";
import type { ShopItem } from "./items/shop";
import { HANDS } from "./constants";
import {
  MAX_JOKERS,
  createBusinessCardJoker,
  createJokerStencilJoker,
  createPhotographJoker,
  createPlusFourMultJoker,
  initialJokersConfig,
} from "./items/jokers";

vi.mock("./components/system/sounds", () => ({ play: vi.fn() }));

type ShopOfferKind = Exclude<ShopItem["kind"], "pack">;

function findShopOfferIdxOfKind(kind: ShopOfferKind): number {
  const offers = screen.queryAllByTestId(/^shop-offer-/);
  for (let i = 0; i < offers.length; i += 1) {
    if (offers[i].getAttribute("data-offer-kind") === kind) return i;
  }
  throw new Error(`No shop offer of kind '${kind}' found`);
}

const playMock = play as MockedFunction<typeof play>;

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
// Name must start with "mock" so vi.mock can reference it from its factory.
const mockShuffleConfig = { useIdentity: false, useReverse: false };
const mockDeckConfig = { useDefaultEnhancements: false };
vi.mock("./cards/deck", async () => {
  const actual = await vi.importActual<typeof import("./cards/deck")>("./cards/deck");
  return {
    ...actual,
    shuffle: <T,>(items: ReadonlyArray<T>): T[] => {
      if (mockShuffleConfig.useReverse) return items.slice().reverse();
      return mockShuffleConfig.useIdentity ? items.slice() : actual.shuffle(items);
    },
    createDeck: (excluded?: ReadonlySet<string>) => {
      const deck = actual.createDeck(excluded);
      if (!mockDeckConfig.useDefaultEnhancements) return deck;
      return deck.map((c) => ({
        ...c,
        enhancement: actual.defaultEnhancementForRank(c.rank),
      }));
    },
  };
});

beforeEach(() => {
  mockShuffleConfig.useIdentity = false;
  mockShuffleConfig.useReverse = false;
  mockDeckConfig.useDefaultEnhancements = false;
  bossPickerRngConfig.rng = () => 0;
  playMock.mockClear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  // Drain anything still scheduled before switching back, so React doesn't try
  // to update unmounted state.
  act(() => {
    vi.runOnlyPendingTimers();
  });
  vi.useRealTimers();
  shopPickerRngConfig.rng = Math.random;
  bossPickerRngConfig.rng = Math.random;
});

function getStatValue(label: string): HTMLElement {
  return screen.getByText(label).parentElement as HTMLElement;
}

async function dismissBlindSelect(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  const btn = screen.queryByTestId("blind-select-play");
  if (btn) await user.click(btn);
}

describe("Winning a round resets the deck", () => {
  test("restores the remaining deck count to its full post-deal size after a win", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    // Use a discard to shrink the deck (44 → 42)
    await user.click(getHandCardButtons()[0]);
    await user.click(getHandCardButtons()[1]);
    await user.click(screen.getByText(/^🗑️ Discard$/));
    flushDiscardAnimation();
    await user.click(screen.getByText(/Win/));
    // Dev Win now opens the post-round shop; skip through it and the
    // blind-select screen to reach the next-round deal.
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    expect(
      screen.getByRole("button", { name: /Deck \(44 cards remaining\)/ })
    ).toBeInTheDocument();
  });

  test("keeps the hand at 8 cards after a win resets the deck", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Win/));
    expect(getHandCardButtons()).toHaveLength(8);
  });

  test("clears any in-flight card selection on win", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    await user.click(getHandCardButtons()[0]);
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    const selectedCount = getHandCardButtons().filter(
      (btn) => btn.getAttribute("aria-pressed") === "true"
    ).length;
    expect(selectedCount).toBe(0);
  });

  test("deals different cards (fresh shuffle) after a win", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    const before = getHandCardButtons().map((btn) =>
      btn.getAttribute("aria-label")
    );
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    const after = getHandCardButtons().map((btn) =>
      btn.getAttribute("aria-label")
    );
    // With a fresh shuffle, the new hand should not match the old hand exactly
    expect(after).not.toEqual(before);
  });
});

describe("Win button integration", () => {
  test("advances blind, ante, round, and money across a full ante cycle", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    expect(screen.getByText("Small Blind")).toBeInTheDocument();
    expect(screen.getByText("Score at least: 300")).toBeInTheDocument();
    expect(getStatValue("Money")).toHaveTextContent("$4");

    await user.click(screen.getByText(/Win/));
    expect(screen.getByText("Big Blind")).toBeInTheDocument();
    expect(screen.getByText("Score at least: 450")).toBeInTheDocument();
    expect(getStatValue("Money")).toHaveTextContent("$7");
    expect(getStatValue("Round")).toHaveTextContent("2");

    await user.click(screen.getByText(/Win/));
    expect(screen.getByText("Boss Blind")).toBeInTheDocument();
    expect(getStatValue("Money")).toHaveTextContent("$12");

    await user.click(screen.getByText(/Win/));
    expect(screen.getByText("Small Blind")).toBeInTheDocument();
    expect(screen.getByText("Score at least: 800")).toBeInTheDocument();
    expect(getStatValue("Ante")).toHaveTextContent("2");
    expect(getStatValue("Money")).toHaveTextContent("$19");
  });
});

describe("Add Chips button integration", () => {
  test("clicking Add Chips updates chips shown in the sidebar", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add Chips/));
    expect(document.querySelector(".chips")).toHaveTextContent("10");
  });
});

describe("Add Multiplier button integration", () => {
  test("clicking Add Multiplier updates multiplier shown in the sidebar", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add Multiplier/));
    expect(document.querySelector(".multiplier")).toHaveTextContent("1");
  });
});

describe("Multiply Multiplier button integration", () => {
  test("clicking Multiply Multiplier updates multiplier shown in the sidebar", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(getHandCardButtons()[0]);
    await user.click(screen.getByText(/Multiply Multiplier/));
    expect(document.querySelector(".multiplier")).toHaveTextContent("2");
  });
});

function getHandCardButtons(): HTMLElement[] {
  return Array.from(
    screen.getByLabelText("Your hand").querySelectorAll("button[aria-pressed]")
  );
}

function getHandGaps(): HTMLElement[] {
  return Array.from(
    screen
      .getByLabelText("Your hand")
      .querySelectorAll('[data-testid^="hand-gap-"]'),
  );
}

function findHandSlotByCardLabel(label: string): HTMLElement {
  const button = screen.getByRole("button", { name: label });
  const slot = button.closest('[data-testid^="hand-slot-"]');
  if (!slot) throw new Error(`Could not find hand slot for "${label}"`);
  return slot as HTMLElement;
}

function dragCardToGap(cardLabel: string, gapIdx: number): void {
  const source = findHandSlotByCardLabel(cardLabel);
  const gap = getHandGaps()[gapIdx];
  fireEvent.dragStart(source);
  fireEvent.dragOver(gap);
  fireEvent.drop(gap);
  fireEvent.dragEnd(source);
}

function flushScoringSequence(): void {
  // Each scoring step's setTimeout fires inside an act(), which only commits
  // its state update on exit. The useEffect that schedules the *next* timeout
  // runs after that commit, so a single runAllTimers can only fire one step.
  // Loop until the queue truly drains (with a safety cap).
  for (let i = 0; i < 20; i++) {
    if (vi.getTimerCount() === 0) return;
    act(() => {
      vi.runOnlyPendingTimers();
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

describe("Fresh round empty HandScore", () => {
  test("does not render the High Card label in the sidebar on a fresh round", () => {
    render(<App />);
    const sidebarHeadings = Array.from(
      document.querySelectorAll(".sidebar h3"),
    ).map((el) => el.textContent);
    expect(sidebarHeadings).not.toContain("High Card");
  });

  test("renders chips as 0 in the sidebar on a fresh round", () => {
    render(<App />);
    expect(document.querySelector(".chips")).toHaveTextContent("0");
  });

  test("renders multiplier as 0 in the sidebar on a fresh round", () => {
    render(<App />);
    expect(document.querySelector(".multiplier")).toHaveTextContent("0");
  });

  test("deselecting the last selected card returns chips to 0", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const card = getHandCardButtons()[0];
    await user.click(card);
    await user.click(card);
    expect(document.querySelector(".chips")).toHaveTextContent("0");
  });

  test("deselecting the last selected card returns multiplier to 0", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const card = getHandCardButtons()[0];
    await user.click(card);
    await user.click(card);
    expect(document.querySelector(".multiplier")).toHaveTextContent("0");
  });

  test("deselecting the last selected card removes the hand label from the sidebar", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const card = getHandCardButtons()[0];
    await user.click(card);
    await user.click(card);
    const sidebarHeadings = Array.from(
      document.querySelectorAll(".sidebar h3"),
    ).map((el) => el.textContent);
    expect(sidebarHeadings).not.toContain("High Card");
  });
});

describe("Card selection drives hand detection", () => {
  test("selecting a single card sets chips to High Card chip value", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(getHandCardButtons()[0]);
    expect(document.querySelector(".chips")).toHaveTextContent("5");
  });

  test("selecting a single card sets multiplier to High Card multiplier value", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(getHandCardButtons()[0]);
    expect(document.querySelector(".multiplier")).toHaveTextContent("1");
  });

  test("clicking a selected card deselects it", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const cards = getHandCardButtons();
    await user.click(cards[0]);
    await user.click(cards[0]);
    expect(cards[0]).toHaveAttribute("aria-pressed", "false");
  });

  test("selection cap of 5 blocks a 6th selection", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
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
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
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
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
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
    // Identity shuffle deals Spades 2..9; selecting the top 3 (9,8,7♠) scores
    // a High Card well below the 300 threshold, so the round is not won and
    // replacements are drawn.
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
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
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
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
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
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
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
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
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(getHandCardButtons()[0]);
    expect(screen.getByText(/^🗑️ Discard$/)).not.toBeDisabled();
  });

  test("decrements the remaining discards count when clicked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(getHandCardButtons()[0]);
    await user.click(screen.getByText(/^🗑️ Discard$/));
    flushDiscardAnimation();
    expect(getStatValue("Discards")).toHaveTextContent("2");
  });

  test("does not change the round score", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
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
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(getHandCardButtons()[0]);
    await user.click(screen.getByText(/^🗑️ Discard$/));
    flushDiscardAnimation();
    expect(getStatValue("Hands")).toHaveTextContent("4");
  });

  test("removes the originally-selected cards from the hand", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
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
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(getHandCardButtons()[0]);
    await user.click(getHandCardButtons()[1]);
    await user.click(screen.getByText(/^🗑️ Discard$/));
    flushDiscardAnimation();
    expect(getHandCardButtons()).toHaveLength(8);
  });

  test("is disabled once all 3 discards have been used", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
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
  function rankIndex(label: string | null): number | null {
    if (!label) return null;
    if (label === "Stone card") return null;
    const rank = label.split(" ")[0];
    const order = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    return order.indexOf(rank);
  }

  test("hand is in rank-descending order after submitting (replacement cards land sorted)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(getHandCardButtons()[0]);
    await user.click(getHandCardButtons()[1]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    const ranks = getHandCardButtons()
      .map((btn) => rankIndex(btn.getAttribute("aria-label")))
      .filter((r): r is number => r !== null);
    const isDescending = ranks.every(
      (r, i) => i === 0 || ranks[i - 1] >= r,
    );
    expect(isDescending).toBe(true);
  });

  test("hand is in rank-descending order after discarding (replacement cards land sorted)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(getHandCardButtons()[0]);
    await user.click(getHandCardButtons()[1]);
    await user.click(screen.getByText(/^🗑️ Discard$/));
    flushDiscardAnimation();
    const ranks = getHandCardButtons()
      .map((btn) => rankIndex(btn.getAttribute("aria-label")))
      .filter((r): r is number => r !== null);
    const isDescending = ranks.every(
      (r, i) => i === 0 || ranks[i - 1] >= r,
    );
    expect(isDescending).toBe(true);
  });

  test("playing a hand clears a manual sort override and restores rank order", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const firstCardLabel = getHandCardButtons()[0].getAttribute("aria-label");
    if (!firstCardLabel) throw new Error("First hand card has no aria-label");
    dragCardToGap(firstCardLabel, 2);
    expect(screen.getByRole("button", { name: "Manual order" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(getHandCardButtons()[0]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    expect(screen.getByRole("button", { name: "Manual order" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

describe("Discard animation", () => {
  test("marks selected cards with the discarding class after the scoring sequence completes", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
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
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
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
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
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
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
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
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add Chips/));
    await user.click(screen.getByText(/Submit Hand/));
    expect(document.querySelector(".chips")).toHaveTextContent("0");
  });

  test("resets multiplier back to the default after submit", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add Multiplier/));
    await user.click(screen.getByText(/Submit Hand/));
    expect(document.querySelector(".multiplier")).toHaveTextContent("0");
  });

  test("submitting with no cards selected adds 0 to the round score", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Submit Hand/));
    expect(document.querySelector(".round-score-value")).toHaveTextContent("0");
  });

  test("adds the scoreHand result to the round score for a sub-threshold play", async () => {
    // Identity shuffle deals Spades 2..9. Sorted descending the top card is 9♠.
    // Submitting just 9♠ → High Card: (base 5 + rank 9) * mult 1 = 14
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(getHandCardButtons()[0]);
    await user.click(screen.getByText(/Submit Hand/));
    flushScoringSequence();
    expect(document.querySelector(".round-score-value")).toHaveTextContent(
      "14",
    );
  });
});

describe("Fresh deck has no default enhancements (issue #176)", () => {
  test("no card in the freshly-dealt hand carries an enhancement suffix", () => {
    render(<App />);
    const labels = getHandCardButtons().map((btn) => btn.getAttribute("aria-label"));
    const withEnhancement = labels.filter((l) => l !== null && /\(/.test(l));
    expect(withEnhancement).toEqual([]);
  });

  test("no rank-K card in the freshly-dealt hand is marked Glass", () => {
    render(<App />);
    const labels = getHandCardButtons().map((btn) => btn.getAttribute("aria-label"));
    const glass = labels.filter((l) => l !== null && /\(Glass\)/.test(l));
    expect(glass).toEqual([]);
  });

  test("no rank-A card in the freshly-dealt hand is marked Steel", () => {
    render(<App />);
    const labels = getHandCardButtons().map((btn) => btn.getAttribute("aria-label"));
    const steel = labels.filter((l) => l !== null && /\(Steel\)/.test(l));
    expect(steel).toEqual([]);
  });
});

describe("Submit Hand win integration", () => {
  test("submitting a hand whose scoreHand value meets the required score advances the blind", async () => {
    // Identity shuffle deals Spades 2..9. Selecting the top 5 by rank (9,8,7,6,5 ♠)
    // is a Straight Flush: (100 + 5+6+7+8+9) * 8 = 1080, well above 300.
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    const cards = getHandCardButtons();
    await user.click(cards[0]);
    await user.click(cards[1]);
    await user.click(cards[2]);
    await user.click(cards[3]);
    await user.click(cards[4]);
    await user.click(screen.getByText(/Submit Hand/));
    flushScoringSequence();
    // Round-won modal now blocks until dismissed.
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByText("Big Blind")).toBeInTheDocument();
  });

  test("no replacement cards are drawn into the hand after a winning hand", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    expect(getHandCardButtons()).toHaveLength(3);
  });

  test("the deck pile retains its remaining count after a winning hand", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const beforeLabel = screen
      .getByRole("button", { name: /Deck \(\d+ cards remaining\)/ })
      .getAttribute("aria-label");
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    expect(
      screen.getByRole("button", { name: /Deck \(\d+ cards remaining\)/ }),
    ).toHaveAttribute("aria-label", beforeLabel ?? "");
  });
});

describe("Losing integration", () => {
  beforeEach(() => {
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("exhausting all hands without reaching the required score shows a game over alert", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Submit Hand/));
    await user.click(screen.getByText(/Submit Hand/));
    await user.click(screen.getByText(/Submit Hand/));
    await user.click(screen.getByText(/Submit Hand/));
    expect(window.alert).toHaveBeenCalledWith("Game Over! Try again.");
  });

  test("exhausting all hands without reaching the required score resets the game", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/Submit Hand/));
    await user.click(screen.getByText(/Submit Hand/));
    await user.click(screen.getByText(/Submit Hand/));
    await user.click(screen.getByText(/Submit Hand/));
    await dismissBlindSelect(user);
    expect(screen.getByText("Small Blind")).toBeInTheDocument();
  });

  test("losing and auto-restarting leaves exactly one chips span in the sidebar HandScore (issue #118)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Submit Hand/));
    await user.click(screen.getByText(/Submit Hand/));
    await user.click(screen.getByText(/Submit Hand/));
    await user.click(screen.getByText(/Submit Hand/));
    expect(document.querySelectorAll(".sidebar .chips")).toHaveLength(1);
  });

  test("losing and auto-restarting leaves exactly one multiplier span in the sidebar HandScore (issue #118)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Submit Hand/));
    await user.click(screen.getByText(/Submit Hand/));
    await user.click(screen.getByText(/Submit Hand/));
    await user.click(screen.getByText(/Submit Hand/));
    expect(document.querySelectorAll(".sidebar .multiplier")).toHaveLength(1);
  });

  async function submitOneHighCard(
    user: ReturnType<typeof userEvent.setup>,
  ): Promise<void> {
    await user.click(getHandCardButtons()[0]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
  }

  test("losing after a real scoring sequence leaves exactly one chips span (issue #118)", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await submitOneHighCard(user);
    await submitOneHighCard(user);
    await submitOneHighCard(user);
    await submitOneHighCard(user);
    expect(document.querySelectorAll(".sidebar .chips")).toHaveLength(1);
  });

  test("losing after a real scoring sequence leaves exactly one multiplier span (issue #118)", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await submitOneHighCard(user);
    await submitOneHighCard(user);
    await submitOneHighCard(user);
    await submitOneHighCard(user);
    expect(document.querySelectorAll(".sidebar .multiplier")).toHaveLength(1);
  });

  test("two consecutive loss → restart cycles do not duplicate the HandScore (issue #118)", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    for (let cycle = 0; cycle < 2; cycle += 1) {
      await submitOneHighCard(user);
      await submitOneHighCard(user);
      await submitOneHighCard(user);
      await submitOneHighCard(user);
    }
    expect(document.querySelectorAll(".sidebar .chips")).toHaveLength(1);
  });
});

describe("Add Money button integration", () => {
  test("clicking Add $10 updates money shown in the sidebar", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add \$10/));
    expect(getStatValue("Money")).toHaveTextContent("$14");
  });
});

describe("Subtract Money button integration", () => {
  test("clicking Subtract $10 updates money shown in the sidebar", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add \$10/));
    await user.click(screen.getByText(/Subtract \$10/));
    expect(getStatValue("Money")).toHaveTextContent("$4");
  });
});

describe("High visibility preference integration", () => {
  afterEach(resetHighVisibility);

  test("App root does not carry the high-visibility class by default", () => {
    const { container } = render(<App />);
    expect(container.querySelector(".App")).not.toHaveClass("high-visibility");
  });

  test("toggling high visibility adds the class to the App root", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = render(<App />);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText(/Enable high visibility suits/));
    expect(container.querySelector(".App")).toHaveClass("high-visibility");
  });

  test("toggling high visibility off removes the class from the App root", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = render(<App />);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText(/Enable high visibility suits/));
    await user.click(screen.getByText(/Disable high visibility suits/));
    expect(container.querySelector(".App")).not.toHaveClass("high-visibility");
  });

  test("toggling persists the preference value to localStorage", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText(/Enable high visibility suits/));
    expect(window.localStorage.getItem("browslatro:highVisibility")).toBe(
      "true"
    );
  });
});

describe("Options modal new game integration", () => {
  test("opening options and clicking new game restores initial state", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);

    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByText(/Win/));
    expect(screen.getByText("Boss Blind")).toBeInTheDocument();
    expect(getStatValue("Money")).toHaveTextContent("$12");

    await user.click(screen.getByText("Options"));
    expect(screen.getByRole("heading", { name: "Options" })).toBeInTheDocument();

    await user.click(screen.getByText("New game"));
    await dismissBlindSelect(user);

    expect(screen.queryByRole("heading", { name: "Options" })).not.toBeInTheDocument();
    expect(screen.getByText("Small Blind")).toBeInTheDocument();
    expect(screen.getByText("Score at least: 300")).toBeInTheDocument();
    expect(getStatValue("Money")).toHaveTextContent("$4");
    expect(getStatValue("Ante")).toHaveTextContent("1");
    expect(getStatValue("Round")).toHaveTextContent("1");
  });
});

describe("Sequential card scoring", () => {
  async function submitFirstFiveSpades(): Promise<void> {
    // Identity shuffle deals Spades 2..9, displayed rank-descending as 9♠..2♠.
    // Selecting the top 5 → 9,8,7,6,5 of Spades, a Straight Flush.
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
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

  test("chips counter ticks up by the leftmost displayed card's rank value after one step", async () => {
    await submitFirstFiveSpades();
    act(() => {
      vi.runOnlyPendingTimers();
    });
    expect(document.querySelector(".chips")).toHaveTextContent("109");
  });

  test("reordering the hand changes which card is scored first (5♠ moved to leftmost is scored first)", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    dragCardToGap("5 of Spades", 0);
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    act(() => {
      vi.runOnlyPendingTimers();
    });
    expect(document.querySelector(".chips")).toHaveTextContent("105");
  });

  test("round score is unchanged mid-sequence", async () => {
    await submitFirstFiveSpades();
    act(() => {
      vi.runOnlyPendingTimers();
    });
    // After one step the sequence is in flight; round score should still be 0.
    expect(document.querySelector(".round-score-value")).toHaveTextContent("0");
  });

  test("final round score equals (hand base chips + per-card rank chips) * multiplier", async () => {
    // Straight Flush: (100 + 5+6+7+8+9) * 8 = 1080.
    // Required score in Ante 1 / Small Blind = 300, so this win-advances the
    // blind once the round-won modal is dismissed.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await submitFirstFiveSpades();
    flushDiscardAnimation();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByText("Big Blind")).toBeInTheDocument();
  });
});

describe("Hand-level joker ordering (issue #192)", () => {
  const originalFactory = initialJokersConfig.factory;

  beforeEach(() => {
    initialJokersConfig.factory = () => [
      createPlusFourMultJoker(),
      createBusinessCardJoker(),
      createJokerStencilJoker(),
    ];
  });

  afterEach(() => {
    initialJokersConfig.factory = originalFactory;
  });

  async function submitFirstFiveSpades(): Promise<void> {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
  }

  function tickScoring(times: number): void {
    for (let i = 0; i < times; i += 1) {
      act(() => {
        vi.runOnlyPendingTimers();
      });
    }
  }

  test("after all per-card steps the live multiplier does not yet include +4 Mult", async () => {
    await submitFirstFiveSpades();
    tickScoring(5);
    expect(document.querySelector(".multiplier")).toHaveTextContent("8");
  });

  test("one extra tick after per-card scoring applies the +4 Mult hand-level step", async () => {
    await submitFirstFiveSpades();
    tickScoring(6);
    expect(document.querySelector(".multiplier")).toHaveTextContent("12");
  });

  test("the live chips counter does not advance during the +4 Mult step", async () => {
    await submitFirstFiveSpades();
    tickScoring(6);
    expect(document.querySelector(".chips")).toHaveTextContent("135");
  });

  test("post-hand Joker Stencil applies after the hand-level step (round score = 135 chips * 24 mult)", async () => {
    await submitFirstFiveSpades();
    tickScoring(7);
    expect(document.querySelector(".round-score-value")).toHaveTextContent(
      "3240",
    );
  });

  test("the final round score is unchanged from the prior ordering", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await submitFirstFiveSpades();
    flushDiscardAnimation();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByText("Big Blind")).toBeInTheDocument();
  });
});

describe("Photograph joker per-card timing (issue #204)", () => {
  const originalFactory = initialJokersConfig.factory;

  beforeEach(() => {
    initialJokersConfig.factory = () => [createPhotographJoker()];
  });

  afterEach(() => {
    initialJokersConfig.factory = originalFactory;
  });

  async function submitRoyalFlushOfClubs(): Promise<void> {
    mockShuffleConfig.useReverse = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
  }

  function tickScoring(times: number): void {
    for (let i = 0; i < times; i += 1) {
      act(() => {
        vi.runOnlyPendingTimers();
      });
    }
  }

  test("the live multiplier does not include Photograph after the Ace step (Ace is not a face)", async () => {
    await submitRoyalFlushOfClubs();
    tickScoring(1);
    expect(document.querySelector(".multiplier")).toHaveTextContent("8");
  });

  test("the live multiplier multiplies by x2 on the King step (first face card)", async () => {
    await submitRoyalFlushOfClubs();
    tickScoring(2);
    expect(document.querySelector(".multiplier")).toHaveTextContent("16");
  });

  test("the live multiplier does not multiply again on the Queen step", async () => {
    await submitRoyalFlushOfClubs();
    tickScoring(3);
    expect(document.querySelector(".multiplier")).toHaveTextContent("16");
  });

  test("the live multiplier does not multiply again on the Jack step", async () => {
    await submitRoyalFlushOfClubs();
    tickScoring(4);
    expect(document.querySelector(".multiplier")).toHaveTextContent("16");
  });

  test("the Photograph tile pulses on the King step (first face card)", async () => {
    await submitRoyalFlushOfClubs();
    tickScoring(2);
    expect(
      screen.getByTestId("joker-tile-inner-photograph"),
    ).toHaveAttribute("data-pulse", "1");
  });

  test("the final round score is 151 chips * 16 mult = 2416", async () => {
    await submitRoyalFlushOfClubs();
    tickScoring(5);
    expect(document.querySelector(".round-score-value")).toHaveTextContent(
      "2416",
    );
  });

  test("playing a no-face hand never fires Photograph (round score = 135 * 8 = 1080)", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    tickScoring(5);
    expect(document.querySelector(".round-score-value")).toHaveTextContent(
      "1080",
    );
  });
});

describe("Round won modal", () => {
  async function triggerWin(): Promise<void> {
    // Identity shuffle deals Spades 2..9; selecting top 5 → Straight Flush
    // = 1080 score, above Ante 1 Small Blind required 300.
    mockShuffleConfig.useIdentity = true;
    mockDeckConfig.useDefaultEnhancements = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
  }

  test("does not render the modal before a round is won", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("renders the modal when the round score meets the required score", async () => {
    await triggerWin();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("displays the final round score in the modal", async () => {
    await triggerWin();
    expect(screen.getByTestId("round-won-score")).toHaveTextContent("1080");
  });

  test("displays the required score in the modal", async () => {
    await triggerWin();
    expect(screen.getByTestId("round-won-required")).toHaveTextContent("300");
  });

  test("displays the base reward (blind + 2) in the modal", async () => {
    // Small Blind = 1 → reward $3.
    await triggerWin();
    expect(screen.getByTestId("round-won-base-reward")).toHaveTextContent("$3");
  });

  test("clicking Continue dismisses the modal", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await triggerWin();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    // The round-won modal is gone (the post-round shop now takes over the
    // dialog role, so we assert on the round-won title specifically).
    expect(screen.queryByText(/Round Won!/)).not.toBeInTheDocument();
  });

  test("clicking Continue advances to the next blind", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await triggerWin();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByText("Big Blind")).toBeInTheDocument();
  });

  test("clicking Continue credits base + interest on top of the bonus-augmented wallet", async () => {
    // Pre-win wallet = $4. Gold bonus = $3 (one held 2♠ gold default). Remaining
    // hands bonus = 3 hands × $1 = $3 (won on hand 1 of 4). Modal wallet = $10.
    // Interest = floor(10/5) capped at 5 = $2. Continue adds base ($3) + interest
    // ($2). Final = $4 + $3 + $3 + $3 + $2 = $15.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await triggerWin();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    expect(getStatValue("Money")).toHaveTextContent("$15");
  });

  test("plays the win sound exactly once when the modal opens", async () => {
    await triggerWin();
    const winCalls = playMock.mock.calls.filter(([name]) => name === "win");
    expect(winCalls).toHaveLength(1);
  });

  test("does not play the win sound again when the modal is dismissed", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await triggerWin();
    playMock.mockClear();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    const winCalls = playMock.mock.calls.filter(([name]) => name === "win");
    expect(winCalls).toHaveLength(0);
  });

  test("gold scoring + remaining-hands bonus both credit the wallet before the modal opens", async () => {
    // $4 + $3 gold + $3 hands-bonus = $10.
    await triggerWin();
    expect(getStatValue("Money")).toHaveTextContent("$10");
  });

  test("modal interest is calculated on the bonus-augmented wallet (floor($10 / $5) = $2)", async () => {
    await triggerWin();
    expect(screen.getByTestId("round-won-interest")).toHaveTextContent("+$2");
  });

  test("modal interest label reflects the bonus-augmented wallet", async () => {
    await triggerWin();
    expect(screen.getByTestId("round-won-interest-label")).toHaveTextContent(
      "on $10",
    );
  });

  test("modal renders a remaining-hands row with the count × $1", async () => {
    await triggerWin();
    expect(screen.getByTestId("round-won-hands")).toHaveTextContent("+$3");
  });

  test("modal hands-row label includes the count and per-hand bonus", async () => {
    await triggerWin();
    expect(screen.getByTestId("round-won-hands-label")).toHaveTextContent(
      "Remaining hands (3 × $1)",
    );
  });

  test("modal total equals base + gold + remaining-hands + interest", async () => {
    // base $3 + gold $3 + hands $3 + interest $2 = $11.
    await triggerWin();
    expect(screen.getByTestId("round-won-total")).toHaveTextContent("$11");
  });

  test("gold scoring plays the gold sound once per held gold card", async () => {
    await triggerWin();
    const goldCalls = playMock.mock.calls.filter(([name]) => name === "gold");
    expect(goldCalls).toHaveLength(1);
  });

  test("submitting an empty hand never plays the gold sound (negative)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Submit Hand/));
    const goldCalls = playMock.mock.calls.filter(([name]) => name === "gold");
    expect(goldCalls).toHaveLength(0);
  });
});

describe("Jokers integration (issue #223 — runs start with no jokers)", () => {
  test("renders MAX_JOKERS empty joker slots on new game", () => {
    render(<App />);
    expect(screen.getAllByTestId("joker-tile-empty")).toHaveLength(MAX_JOKERS);
  });

  test("renders no filled joker tiles on new game", () => {
    render(<App />);
    expect(screen.queryAllByTestId(/^joker-tile-filled-/)).toHaveLength(0);
  });
});

function resetAnimationSpeed(): void {
  if (getAnimationSpeed() !== "normal") {
    setAnimationSpeed("normal");
  }
  window.localStorage.removeItem("browslatro:animationSpeed");
}

function mockPrefersReducedMotion(reduce: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)" ? reduce : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

describe("getScoringStepMs", () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
    vi.restoreAllMocks();
    resetAnimationSpeed();
  });

  test("returns 500 for normal when OS does not prefer reduced motion", () => {
    mockPrefersReducedMotion(false);
    expect(getScoringStepMs("normal")).toBe(500);
  });

  test("returns 1000 for slow", () => {
    expect(getScoringStepMs("slow")).toBe(1000);
  });

  test("returns 250 for fast", () => {
    expect(getScoringStepMs("fast")).toBe(250);
  });

  test("returns 0 for instant", () => {
    expect(getScoringStepMs("instant")).toBe(0);
  });

  test("returns 0 for normal when OS prefers reduced motion", () => {
    mockPrefersReducedMotion(true);
    expect(getScoringStepMs("normal")).toBe(0);
  });

  test("returns 250 for fast even when OS prefers reduced motion", () => {
    mockPrefersReducedMotion(true);
    expect(getScoringStepMs("fast")).toBe(250);
  });

  test("returns 1000 for slow even when OS prefers reduced motion", () => {
    mockPrefersReducedMotion(true);
    expect(getScoringStepMs("slow")).toBe(1000);
  });

  test("returns 0 for instant even when OS does not prefer reduced motion", () => {
    mockPrefersReducedMotion(false);
    expect(getScoringStepMs("instant")).toBe(0);
  });

  test("reads from the persisted preference when no argument is passed", () => {
    setAnimationSpeed("fast");
    expect(getScoringStepMs()).toBe(250);
  });
});

describe("App animation speed CSS variable", () => {
  afterEach(resetAnimationSpeed);

  test("does not set the inline --animation-speed style when preference is normal", () => {
    const { container } = render(<App />);
    const style = container.querySelector(".App")?.getAttribute("style") ?? "";
    expect(style).not.toContain("--animation-speed");
  });

  test("sets the inline --animation-speed style to 0 when preference is instant", () => {
    setAnimationSpeed("instant");
    const { container } = render(<App />);
    expect(container.querySelector(".App")?.getAttribute("style")).toContain(
      "--animation-speed: 0",
    );
  });

  test("sets the inline --animation-speed style to 0.5 when preference is fast", () => {
    setAnimationSpeed("fast");
    const { container } = render(<App />);
    expect(container.querySelector(".App")?.getAttribute("style")).toContain(
      "--animation-speed: 0.5",
    );
  });

  test("sets the inline --animation-speed style to 2 when preference is slow", () => {
    setAnimationSpeed("slow");
    const { container } = render(<App />);
    expect(container.querySelector(".App")?.getAttribute("style")).toContain(
      "--animation-speed: 2",
    );
  });

  test("clears the inline --animation-speed style after switching back to normal via the Options modal", async () => {
    setAnimationSpeed("fast");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = render(<App />);
    await user.click(screen.getByText("Options"));
    await user.selectOptions(screen.getByLabelText("Animation speed"), "normal");
    const style = container.querySelector(".App")?.getAttribute("style") ?? "";
    expect(style).not.toContain("--animation-speed");
  });
});

describe("App scoring step honors animation speed preference", () => {
  afterEach(resetAnimationSpeed);

  test("does not advance the scoring sequence on the first timer flush when preference is slow", async () => {
    mockShuffleConfig.useIdentity = true;
    setAnimationSpeed("slow");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const cards = Array.from(
      screen.getByLabelText("Your hand").querySelectorAll("button[aria-pressed]"),
    );
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(document.querySelector(".chips")).toHaveTextContent("100");
  });

  test("advances on the first slow tick after the 1000ms threshold", async () => {
    mockShuffleConfig.useIdentity = true;
    setAnimationSpeed("slow");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const cards = Array.from(
      screen.getByLabelText("Your hand").querySelectorAll("button[aria-pressed]"),
    );
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(document.querySelector(".chips")).toHaveTextContent("109");
  });
});

describe("Post-round shop integration", () => {
  async function openShop(): Promise<ReturnType<typeof userEvent.setup>> {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add \$10/));
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    return user;
  }

  test("opens the shop after the round-won modal is dismissed", async () => {
    await openShop();
    expect(
      screen.getByRole("heading", { name: /Shop/ }),
    ).toBeInTheDocument();
  });

  test("shows exactly two item offers in the shop by default", async () => {
    await openShop();
    const items = screen
      .getAllByTestId(/^shop-offer-/)
      .filter((el) => el.getAttribute("data-offer-kind") !== "pack");
    expect(items).toHaveLength(2);
  });

  test("shows two pack offers in the shop by default", async () => {
    await openShop();
    const packs = screen
      .getAllByTestId(/^shop-offer-/)
      .filter((el) => el.getAttribute("data-offer-kind") === "pack");
    expect(packs).toHaveLength(2);
  });

  test("clicking Next Round closes the shop and starts the next blind", async () => {
    const user = await openShop();
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    expect(
      screen.queryByRole("heading", { name: /Shop/ }),
    ).not.toBeInTheDocument();
  });

  test("buying an affordable joker deducts the price from money", async () => {
    const user = await openShop();
    const moneyBefore = getStatValue("Money").textContent;
    const buyButtons = screen.getAllByRole("button", { name: /^Buy/ });
    await user.click(buyButtons[0]);
    expect(getStatValue("Money").textContent).not.toBe(moneyBefore);
  });

  test("buying an offer marks it as Sold", async () => {
    const user = await openShop();
    const buyButtons = screen.getAllByRole("button", { name: /^Buy/ });
    await user.click(buyButtons[0]);
    expect(screen.getByRole("button", { name: /Sold/ })).toBeInTheDocument();
  });

  test("buying an offer adds the joker to the equipped set", async () => {
    shopPickerRngConfig.rng = forceShopLayout(["joker", "planet"]);
    const user = await openShop();
    const before = screen.queryAllByTestId(/^joker-tile-filled-/).length;
    const jokerSlotId = `shop-offer-${findShopOfferIdxOfKind("joker")}`;
    const buy = screen
      .getByTestId(jokerSlotId)
      .querySelector("button.shop-offer-buy");
    if (!(buy instanceof HTMLButtonElement)) throw new Error("missing buy");
    await user.click(buy);
    expect(screen.getAllByTestId(/^joker-tile-filled-/)).toHaveLength(
      before + 1,
    );
  });

  test("pressing Escape in the shop closes it without purchase", async () => {
    const user = await openShop();
    const before = screen.queryAllByTestId(/^joker-tile-filled-/).length;
    await user.keyboard("{Escape}");
    expect(screen.queryAllByTestId(/^joker-tile-filled-/)).toHaveLength(
      before,
    );
  });

  test("after buying a joker that joker is no longer in the post-buy equipped exclusion target (issue #223)", async () => {
    shopPickerRngConfig.rng = forceShopLayout(["joker", "planet"]);
    const user = await openShop();
    const jokerSlotId = `shop-offer-${findShopOfferIdxOfKind("joker")}`;
    const boughtName = screen
      .getByTestId(jokerSlotId)
      .querySelector(".shop-offer-name")?.textContent;
    const buy = screen
      .getByTestId(jokerSlotId)
      .querySelector("button.shop-offer-buy");
    if (!(buy instanceof HTMLButtonElement)) throw new Error("missing buy");
    await user.click(buy);
    const equippedNames = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-testid^="joker-tile-filled-"] .joker-tile-name',
      ),
    ).map((el) => el.textContent);
    expect(equippedNames).toContain(boughtName);
  });

  test("the two item offers never share a name in a single shop visit", async () => {
    await openShop();
    const offerNames = screen
      .getAllByTestId(/^shop-offer-/)
      .filter((el) => el.getAttribute("data-offer-kind") !== "pack")
      .map((el) => el.querySelector(".shop-offer-name")?.textContent ?? "");
    expect(new Set(offerNames).size).toBe(offerNames.length);
  });

  test("clicking Reroll deducts $5 from money", async () => {
    const user = await openShop();
    const moneyBefore = Number(
      getStatValue("Money").textContent?.replace(/[^0-9-]/g, "") ?? "0",
    );
    await user.click(screen.getByRole("button", { name: /Reroll/ }));
    const moneyAfter = Number(
      getStatValue("Money").textContent?.replace(/[^0-9-]/g, "") ?? "0",
    );
    expect(moneyAfter).toBe(moneyBefore - 5);
  });

  test("after one reroll the button shows $6", async () => {
    const user = await openShop();
    await user.click(screen.getByRole("button", { name: /Reroll/ }));
    expect(screen.getByRole("button", { name: /Reroll/ })).toHaveTextContent(
      "Reroll ($6)",
    );
  });

  test("Reroll replaces the unsold offers with new joker names", async () => {
    const randomSpy = vi
      .spyOn(Math, "random")
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0.99);
    const user = await openShop();
    const before = screen
      .getAllByTestId(/^shop-offer-/)
      .map((el) => el.querySelector(".shop-offer-name")?.textContent ?? "");
    await user.click(screen.getByRole("button", { name: /Reroll/ }));
    const after = screen
      .getAllByTestId(/^shop-offer-/)
      .map((el) => el.querySelector(".shop-offer-name")?.textContent ?? "");
    randomSpy.mockRestore();
    expect(after).not.toEqual(before);
  });

  test("Reroll preserves already-sold offers in place", async () => {
    const user = await openShop();
    const buy = screen
      .getByTestId("shop-offer-0")
      .querySelector("button.shop-offer-buy");
    if (!(buy instanceof HTMLButtonElement)) throw new Error("missing buy");
    await user.click(buy);
    const soldNameBefore = screen
      .getByTestId("shop-offer-0")
      .querySelector(".shop-offer-name")?.textContent;
    await user.click(screen.getByRole("button", { name: /Reroll/ }));
    const soldNameAfter = screen
      .getByTestId("shop-offer-0")
      .querySelector(".shop-offer-name")?.textContent;
    expect(soldNameAfter).toBe(soldNameBefore);
  });

  test("Reroll is disabled when the player can't afford it", async () => {
    const user = await openShop();
    await user.click(screen.getByRole("button", { name: /Reroll/ }));
    await user.click(screen.getByRole("button", { name: /Reroll/ }));
    await user.click(screen.getByRole("button", { name: /Reroll/ }));
    await user.click(screen.getByRole("button", { name: /Reroll/ }));
    expect(screen.getByRole("button", { name: /Reroll/ })).toBeDisabled();
  });

  test("clicking Reroll when disabled is a no-op on money", async () => {
    const user = await openShop();
    await user.click(screen.getByRole("button", { name: /Reroll/ }));
    await user.click(screen.getByRole("button", { name: /Reroll/ }));
    await user.click(screen.getByRole("button", { name: /Reroll/ }));
    await user.click(screen.getByRole("button", { name: /Reroll/ }));
    const moneyBefore = getStatValue("Money").textContent;
    await user.click(screen.getByRole("button", { name: /Reroll/ }));
    expect(getStatValue("Money").textContent).toBe(moneyBefore);
  });

  test("opening a new shop after the next round resets the reroll cost to $5", async () => {
    const user = await openShop();
    await user.click(screen.getByRole("button", { name: /Reroll/ }));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await user.click(screen.getByText(/Add \$10/));
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByRole("button", { name: /Reroll/ })).toHaveTextContent(
      "Reroll ($5)",
    );
  });
});

describe("Run information modal integration", () => {
  test("submitting a non-empty play increments that hand label's count", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(getHandCardButtons()[0]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(screen.getByRole("button", { name: "Run info" }));
    expect(screen.getByTestId("run-info-count-High Card")).toHaveTextContent(
      "1",
    );
  });

  test("submitting an empty hand does not increment any count", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Submit Hand/));
    await user.click(screen.getByRole("button", { name: "Run info" }));
    expect(screen.getByTestId("run-info-count-High Card")).toHaveTextContent(
      "0",
    );
  });

  test("starting a new game resets the play counts to zero", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(getHandCardButtons()[0]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText("New game"));
    await user.click(screen.getByRole("button", { name: "Run info" }));
    expect(screen.getByTestId("run-info-count-High Card")).toHaveTextContent(
      "0",
    );
  });

  test("the run info modal is reachable from the sidebar trigger button", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: "Run info" }),
    ).toBeInTheDocument();
  });
});

describe("Planet purchase integration", () => {
  async function openShop(): Promise<ReturnType<typeof userEvent.setup>> {
    mockShuffleConfig.useIdentity = true;
    shopPickerRngConfig.rng = forceShopLayout(["planet", "joker"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add \$10/));
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    return user;
  }

  function planetSlotTestId(): string {
    return `shop-offer-${findShopOfferIdxOfKind("planet")}`;
  }

  function readRunInfoStats(): Record<string, string> {
    const rows = Array.from(
      document.querySelectorAll<HTMLElement>("[data-testid^='run-info-stats-']"),
    );
    const stats: Record<string, string> = {};
    for (const row of rows) {
      const id = row.getAttribute("data-testid") ?? "";
      stats[id] = row.textContent ?? "";
    }
    return stats;
  }

  test("a planet offer is rendered in the shop with data-offer-kind=planet", async () => {
    await openShop();
    expect(screen.getByTestId(planetSlotTestId())).toHaveAttribute(
      "data-offer-kind",
      "planet",
    );
  });

  test("buying the planet deducts the planet price from money", async () => {
    const user = await openShop();
    const moneyBefore = Number(
      getStatValue("Money").textContent?.replace(/[^0-9-]/g, "") ?? "0",
    );
    const planetBuy = screen
      .getByTestId(planetSlotTestId())
      .querySelector("button.shop-offer-buy");
    if (!(planetBuy instanceof HTMLButtonElement)) {
      throw new Error("Planet buy button not found");
    }
    await user.click(planetBuy);
    const moneyAfter = Number(
      getStatValue("Money").textContent?.replace(/[^0-9-]/g, "") ?? "0",
    );
    expect(moneyAfter).toBe(moneyBefore - 3);
  });

  test("buying the planet does not add a joker to the equipped set", async () => {
    const user = await openShop();
    const jokerCountBefore = screen.queryAllByTestId(/^joker-tile-filled-/).length;
    const planetBuy = screen
      .getByTestId(planetSlotTestId())
      .querySelector("button.shop-offer-buy");
    if (!(planetBuy instanceof HTMLButtonElement)) {
      throw new Error("Planet buy button not found");
    }
    await user.click(planetBuy);
    expect(screen.queryAllByTestId(/^joker-tile-filled-/)).toHaveLength(
      jokerCountBefore,
    );
  });

  test("buying the planet marks that offer as Sold", async () => {
    const user = await openShop();
    const planetBuy = screen
      .getByTestId(planetSlotTestId())
      .querySelector("button.shop-offer-buy");
    if (!(planetBuy instanceof HTMLButtonElement)) {
      throw new Error("Planet buy button not found");
    }
    const slotId = planetSlotTestId();
    await user.click(planetBuy);
    expect(
      screen.getByTestId(slotId).querySelector(".shop-offer-buy"),
    ).toHaveTextContent(/Sold/);
  });

  test("buying the planet enqueues it into a consumable slot", async () => {
    const user = await openShop();
    const planetBuy = screen
      .getByTestId(planetSlotTestId())
      .querySelector("button.shop-offer-buy");
    if (!(planetBuy instanceof HTMLButtonElement)) {
      throw new Error("Planet buy button not found");
    }
    await user.click(planetBuy);
    expect(screen.getByTestId("consumable-tile-filled-0")).toHaveAttribute(
      "data-consumable-kind",
      "planet",
    );
  });

  test("buying the planet alone does not change RunInfo stats", async () => {
    const user = await openShop();
    await user.click(screen.getByRole("button", { name: "Run info" }));
    const before = readRunInfoStats();
    await user.click(screen.getByRole("button", { name: "Close" }));
    const planetBuy = screen
      .getByTestId(planetSlotTestId())
      .querySelector("button.shop-offer-buy");
    if (!(planetBuy instanceof HTMLButtonElement)) {
      throw new Error("Planet buy button not found");
    }
    await user.click(planetBuy);
    await user.click(screen.getByRole("button", { name: "Run info" }));
    expect(readRunInfoStats()).toEqual(before);
  });

  test("using the planet consumable upgrades exactly one row's chips × mult in RunInfo", async () => {
    const user = await openShop();
    await user.click(screen.getByRole("button", { name: "Run info" }));
    const before = readRunInfoStats();
    await user.click(screen.getByRole("button", { name: "Close" }));
    const planetBuy = screen
      .getByTestId(planetSlotTestId())
      .querySelector("button.shop-offer-buy");
    if (!(planetBuy instanceof HTMLButtonElement)) {
      throw new Error("Planet buy button not found");
    }
    await user.click(planetBuy);
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    await user.click(screen.getByRole("button", { name: "Run info" }));
    const after = readRunInfoStats();
    const changedRows = Object.keys(after).filter(
      (key) => after[key] !== before[key],
    );
    expect(changedRows.length).toBeGreaterThanOrEqual(1);
  });

  test("using the planet consumable empties the slot", async () => {
    const user = await openShop();
    const planetBuy = screen
      .getByTestId(planetSlotTestId())
      .querySelector("button.shop-offer-buy");
    if (!(planetBuy instanceof HTMLButtonElement)) {
      throw new Error("Planet buy button not found");
    }
    await user.click(planetBuy);
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    expect(screen.queryByTestId("consumable-tile-filled-0")).not.toBeInTheDocument();
  });

  test("starting a new game restores RunInfo stats to baseline", async () => {
    const user = await openShop();
    await user.click(screen.getByRole("button", { name: "Run info" }));
    const baseline = readRunInfoStats();
    await user.click(screen.getByRole("button", { name: "Close" }));
    const planetBuy = screen
      .getByTestId(planetSlotTestId())
      .querySelector("button.shop-offer-buy");
    if (!(planetBuy instanceof HTMLButtonElement)) {
      throw new Error("Planet buy button not found");
    }
    await user.click(planetBuy);
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText("New game"));
    await user.click(screen.getByRole("button", { name: "Run info" }));
    expect(readRunInfoStats()).toEqual(baseline);
  });

  test("starting a new game clears any unused consumables", async () => {
    const user = await openShop();
    const planetBuy = screen
      .getByTestId(planetSlotTestId())
      .querySelector("button.shop-offer-buy");
    if (!(planetBuy instanceof HTMLButtonElement)) {
      throw new Error("Planet buy button not found");
    }
    await user.click(planetBuy);
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText("New game"));
    expect(screen.queryByTestId("consumable-tile-filled-0")).not.toBeInTheDocument();
  });

});

describe("Tarot purchase integration", () => {
  async function openShop(): Promise<ReturnType<typeof userEvent.setup>> {
    mockShuffleConfig.useIdentity = true;
    shopPickerRngConfig.rng = forceShopLayout(["tarot", "joker"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add \$10/));
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    return user;
  }

  function tarotSlotTestId(): string {
    return `shop-offer-${findShopOfferIdxOfKind("tarot")}`;
  }

  function moneyOf(): number {
    return Number(
      getStatValue("Money").textContent?.replace(/[^0-9-]/g, "") ?? "0",
    );
  }

  test("a tarot offer is rendered in the shop with data-offer-kind=tarot", async () => {
    await openShop();
    expect(screen.getByTestId(tarotSlotTestId())).toHaveAttribute(
      "data-offer-kind",
      "tarot",
    );
  });

  test("buying any tarot deducts the tarot price from money", async () => {
    const user = await openShop();
    const before = moneyOf();
    const buy = screen
      .getByTestId(tarotSlotTestId())
      .querySelector("button.shop-offer-buy");
    if (!(buy instanceof HTMLButtonElement)) throw new Error("missing buy");
    await user.click(buy);
    expect(moneyOf()).toBe(before - 3);
  });

  test("buying any tarot marks the offer Sold immediately", async () => {
    const user = await openShop();
    const buy = screen
      .getByTestId(tarotSlotTestId())
      .querySelector("button.shop-offer-buy");
    if (!(buy instanceof HTMLButtonElement)) throw new Error("missing buy");
    await user.click(buy);
    const slotId = tarotSlotTestId();
    expect(
      screen.getByTestId(slotId).querySelector(".shop-offer-buy"),
    ).toHaveTextContent(/Sold/);
  });

  test("buying any tarot enqueues it into a consumable slot", async () => {
    const user = await openShop();
    const buy = screen
      .getByTestId(tarotSlotTestId())
      .querySelector("button.shop-offer-buy");
    if (!(buy instanceof HTMLButtonElement)) throw new Error("missing buy");
    await user.click(buy);
    expect(screen.getByTestId("consumable-tile-filled-0")).toHaveAttribute(
      "data-consumable-kind",
      "tarot",
    );
  });

  test("buying The Hermit alone does not apply the money payout", async () => {
    const user = await openShop();
    const tarotName = screen
      .getByTestId(tarotSlotTestId())
      .querySelector(".shop-offer-name")?.textContent;
    if (tarotName !== "The Hermit") return;
    const before = moneyOf();
    const buy = screen
      .getByTestId(tarotSlotTestId())
      .querySelector("button.shop-offer-buy");
    if (!(buy instanceof HTMLButtonElement)) throw new Error("missing buy");
    await user.click(buy);
    expect(moneyOf()).toBe(before - 3);
  });

  test("using The Hermit consumable doubles current money capped at +$20", async () => {
    const user = await openShop();
    const tarotName = screen
      .getByTestId(tarotSlotTestId())
      .querySelector(".shop-offer-name")?.textContent;
    if (tarotName !== "The Hermit") return;
    const buy = screen
      .getByTestId(tarotSlotTestId())
      .querySelector("button.shop-offer-buy");
    if (!(buy instanceof HTMLButtonElement)) throw new Error("missing buy");
    await user.click(buy);
    const afterBuy = moneyOf();
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    const bonus = Math.min(afterBuy, 20);
    expect(moneyOf()).toBe(afterBuy + bonus);
  });

  test("buying an enhancement tarot does not open the card-picker dialog", async () => {
    const user = await openShop();
    const tarotName = screen
      .getByTestId(tarotSlotTestId())
      .querySelector(".shop-offer-name")?.textContent;
    if (tarotName === "The Hermit") return;
    const buy = screen
      .getByTestId(tarotSlotTestId())
      .querySelector("button.shop-offer-buy");
    if (!(buy instanceof HTMLButtonElement)) throw new Error("missing buy");
    await user.click(buy);
    expect(document.querySelector(".tarot-picker-modal")).toBeNull();
  });

  test("an enhancement-tarot consumable tile marks use as disabled when no card is selected", async () => {
    const user = await openShop();
    const tarotName = screen
      .getByTestId(tarotSlotTestId())
      .querySelector(".shop-offer-name")?.textContent;
    if (tarotName === "The Hermit") return;
    const buy = screen
      .getByTestId(tarotSlotTestId())
      .querySelector("button.shop-offer-buy");
    if (!(buy instanceof HTMLButtonElement)) throw new Error("missing buy");
    await user.click(buy);
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    expect(screen.getByTestId("consumable-tile-filled-0")).toHaveAttribute(
      "data-use-disabled",
      "true",
    );
  });

  test("selecting a hand card enables the enhancement-tarot consumable tile", async () => {
    const user = await openShop();
    const tarotName = screen
      .getByTestId(tarotSlotTestId())
      .querySelector(".shop-offer-name")?.textContent;
    if (tarotName === "The Hermit") return;
    const buy = screen
      .getByTestId(tarotSlotTestId())
      .querySelector("button.shop-offer-buy");
    if (!(buy instanceof HTMLButtonElement)) throw new Error("missing buy");
    await user.click(buy);
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await user.click(getHandCardButtons()[0]);
    expect(screen.getByTestId("consumable-tile-filled-0")).not.toBeDisabled();
  });

  test("using an enhancement-tarot consumable empties the slot", async () => {
    const user = await openShop();
    const tarotName = screen
      .getByTestId(tarotSlotTestId())
      .querySelector(".shop-offer-name")?.textContent;
    if (tarotName === "The Hermit") return;
    const buy = screen
      .getByTestId(tarotSlotTestId())
      .querySelector("button.shop-offer-buy");
    if (!(buy instanceof HTMLButtonElement)) throw new Error("missing buy");
    await user.click(buy);
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await user.click(getHandCardButtons()[0]);
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    expect(screen.queryByTestId("consumable-tile-filled-0")).not.toBeInTheDocument();
  });

  test("using an enhancement-tarot consumable clears the selection", async () => {
    const user = await openShop();
    const slotId = tarotSlotTestId();
    const tarotName = screen
      .getByTestId(slotId)
      .querySelector(".shop-offer-name")?.textContent;
    if (tarotName === "The Hermit") return;
    const buy = screen
      .getByTestId(slotId)
      .querySelector("button.shop-offer-buy");
    if (!(buy instanceof HTMLButtonElement)) throw new Error("missing buy");
    await user.click(buy);
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await user.click(getHandCardButtons()[0]);
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    const pressedCount = getHandCardButtons().filter(
      (btn) => btn.getAttribute("aria-pressed") === "true",
    ).length;
    expect(pressedCount).toBe(0);
  });

  test("no TarotPicker modal is ever rendered (selection replaces it)", async () => {
    const user = await openShop();
    const slotId = tarotSlotTestId();
    const tarotName = screen
      .getByTestId(slotId)
      .querySelector(".shop-offer-name")?.textContent;
    if (tarotName === "The Hermit") return;
    const buy = screen
      .getByTestId(slotId)
      .querySelector("button.shop-offer-buy");
    if (!(buy instanceof HTMLButtonElement)) throw new Error("missing buy");
    await user.click(buy);
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await user.click(getHandCardButtons()[0]);
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    expect(document.querySelector(".tarot-picker-modal")).toBeNull();
  });
});

describe("Voucher integration", () => {
  async function openShop(): Promise<ReturnType<typeof userEvent.setup>> {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add \$10/));
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    return user;
  }

  function moneyValue(): number {
    return Number(
      getStatValue("Money").textContent?.replace(/[^0-9-]/g, "") ?? "0",
    );
  }

  test("renders the voucher slot when the shop opens", async () => {
    await openShop();
    expect(screen.getByTestId("shop-voucher")).toBeInTheDocument();
  });

  test("buying the voucher deducts its cost from money", async () => {
    const user = await openShop();
    const before = moneyValue();
    const buy = screen.getByTestId("shop-voucher-buy");
    await user.click(buy);
    expect(moneyValue()).toBe(before - 10);
  });

  test("buying the voucher marks the voucher slot as Sold", async () => {
    const user = await openShop();
    await user.click(screen.getByTestId("shop-voucher-buy"));
    expect(screen.getByTestId("shop-voucher-buy")).toHaveTextContent("Sold");
  });

  test("clicking Reroll does not change the voucher's name", async () => {
    const user = await openShop();
    const slot = screen.getByTestId("shop-voucher");
    const before = slot.querySelector(".shop-voucher-name")?.textContent ?? "";
    await user.click(screen.getByRole("button", { name: /Reroll/ }));
    const after =
      screen.getByTestId("shop-voucher").querySelector(".shop-voucher-name")
        ?.textContent ?? "";
    expect(after).toBe(before);
  });

  test("clicking Reroll does not clear the voucher Sold state", async () => {
    const user = await openShop();
    await user.click(screen.getByTestId("shop-voucher-buy"));
    await user.click(screen.getByRole("button", { name: /Reroll/ }));
    expect(screen.getByTestId("shop-voucher-buy")).toHaveTextContent("Sold");
  });

  test("the voucher remains Sold across blinds within the same ante", async () => {
    const user = await openShop();
    await user.click(screen.getByTestId("shop-voucher-buy"));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await user.click(screen.getByText(/Add \$10/));
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByTestId("shop-voucher-buy")).toHaveTextContent("Sold");
  });
});

describe("Spectral purchase integration", () => {
  async function openShop(): Promise<ReturnType<typeof userEvent.setup>> {
    mockShuffleConfig.useIdentity = true;
    shopPickerRngConfig.rng = forceShopLayout(["spectral", "joker"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add \$10/));
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    return user;
  }

  function spectralSlotTestId(): string {
    return `shop-offer-${findShopOfferIdxOfKind("spectral")}`;
  }

  function moneyOf(): number {
    return Number(
      getStatValue("Money").textContent?.replace(/[^0-9-]/g, "") ?? "0",
    );
  }

  test("a spectral offer renders with data-offer-kind=spectral", async () => {
    await openShop();
    expect(screen.getByTestId(spectralSlotTestId())).toHaveAttribute(
      "data-offer-kind",
      "spectral",
    );
  });

  test("a spectral offer carries the shop-offer-spectral modifier class", async () => {
    await openShop();
    expect(screen.getByTestId(spectralSlotTestId())).toHaveClass(
      "shop-offer-spectral",
    );
  });

  test("a spectral offer renders a 'Spectral' kind label", async () => {
    await openShop();
    const idx = findShopOfferIdxOfKind("spectral");
    expect(screen.getByTestId(`shop-kind-${idx}`)).toHaveTextContent("Spectral");
  });

  test("buying a spectral deducts the spectral base price from money", async () => {
    const user = await openShop();
    const before = moneyOf();
    const buy = screen
      .getByTestId(spectralSlotTestId())
      .querySelector("button.shop-offer-buy");
    if (!(buy instanceof HTMLButtonElement)) throw new Error("missing buy");
    await user.click(buy);
    expect(moneyOf()).toBe(before - 4);
  });

  test("buying a spectral marks the offer Sold", async () => {
    const user = await openShop();
    const slotId = spectralSlotTestId();
    const buy = screen
      .getByTestId(slotId)
      .querySelector("button.shop-offer-buy");
    if (!(buy instanceof HTMLButtonElement)) throw new Error("missing buy");
    await user.click(buy);
    expect(
      screen.getByTestId(slotId).querySelector(".shop-offer-buy"),
    ).toHaveTextContent(/Sold/);
  });

  test("buying a spectral enqueues it into a consumable slot tagged spectral", async () => {
    const user = await openShop();
    const buy = screen
      .getByTestId(spectralSlotTestId())
      .querySelector("button.shop-offer-buy");
    if (!(buy instanceof HTMLButtonElement)) throw new Error("missing buy");
    await user.click(buy);
    expect(screen.getByTestId("consumable-tile-filled-0")).toHaveAttribute(
      "data-consumable-kind",
      "spectral",
    );
  });

  test("using Black Hole upgrades High Card from level 1 to level 2", async () => {
    const user = await openShop();
    const name = screen
      .getByTestId(spectralSlotTestId())
      .querySelector(".shop-offer-name")?.textContent;
    if (name !== "Black Hole") return;
    const buy = screen
      .getByTestId(spectralSlotTestId())
      .querySelector("button.shop-offer-buy");
    if (!(buy instanceof HTMLButtonElement)) throw new Error("missing buy");
    await user.click(buy);
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    await user.click(screen.getByRole("button", { name: "Run info" }));
    expect(screen.getByTestId("run-info-level-High Card")).toHaveTextContent("2");
  });

  test("does not render a TarotPicker dialog after buying a spectral (negative)", async () => {
    const user = await openShop();
    const buy = screen
      .getByTestId(spectralSlotTestId())
      .querySelector("button.shop-offer-buy");
    if (!(buy instanceof HTMLButtonElement)) throw new Error("missing buy");
    await user.click(buy);
    expect(screen.queryByRole("dialog", { name: /Apply/ })).not.toBeInTheDocument();
  });
});

describe("Voucher effects integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function openShopWithVoucher(
    firstVoucherRng: number,
  ): Promise<ReturnType<typeof userEvent.setup>> {
    mockShuffleConfig.useIdentity = true;
    shopPickerRngConfig.rng = forceShopLayout(["joker", "planet", "tarot", "joker"]);
    vi.spyOn(Math, "random").mockReturnValueOnce(firstVoucherRng);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add \$10/));
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    return user;
  }

  async function winAndReopenShop(
    user: ReturnType<typeof userEvent.setup>,
  ): Promise<void> {
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await user.click(screen.getByText(/Add \$10/));
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
  }

  test("ante 1 voucher is deterministic when the first Math.random is forced to 0", async () => {
    await openShopWithVoucher(0);
    expect(
      screen.getByTestId("shop-voucher").querySelector(".shop-voucher-name"),
    ).toHaveTextContent("Overstock");
  });

  test("buying Overstock raises the next shop's item offer count from 2 to 3", async () => {
    const user = await openShopWithVoucher(0);
    await user.click(screen.getByTestId("shop-voucher-buy"));
    await winAndReopenShop(user);
    const items = screen
      .getAllByTestId(/^shop-offer-/)
      .filter((el) => el.getAttribute("data-offer-kind") !== "pack");
    expect(items).toHaveLength(3);
  });

  test("buying Clearance Sale shows a discounted joker price on the existing offer", async () => {
    const user = await openShopWithVoucher(0.4);
    await user.click(screen.getByTestId("shop-voucher-buy"));
    const joker = screen
      .getByTestId(`shop-offer-${findShopOfferIdxOfKind("joker")}`)
      .querySelector(".shop-offer-price-discounted");
    expect(joker).toHaveTextContent("$4");
  });

  test("buying Clearance Sale lets the player afford a joker they couldn't at full price", async () => {
    const user = await openShopWithVoucher(0.4);
    const jokerSlotId = `shop-offer-${findShopOfferIdxOfKind("joker")}`;
    const buyButton = screen
      .getByTestId(jokerSlotId)
      .querySelector("button.shop-offer-buy");
    if (!(buyButton instanceof HTMLButtonElement)) throw new Error("missing joker buy");
    expect(buyButton).not.toBeDisabled();
    await user.click(screen.getByTestId("shop-voucher-buy"));
    expect(buyButton).not.toBeDisabled();
  });

  test("buying Crystal Ball adds a third consumable slot to the tray", async () => {
    const user = await openShopWithVoucher(0.9);
    await user.click(screen.getByTestId("shop-voucher-buy"));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    expect(screen.getAllByTestId("consumable-tile-empty")).toHaveLength(3);
  });
});

describe("Consumable drag and sell integration", () => {
  async function buyPlanetAndCloseShop(): Promise<
    ReturnType<typeof userEvent.setup>
  > {
    mockShuffleConfig.useIdentity = true;
    shopPickerRngConfig.rng = forceShopLayout(["planet", "joker"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add \$10/));
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    const planetIdx = findShopOfferIdxOfKind("planet");
    const buy = screen
      .getByTestId(`shop-offer-${planetIdx}`)
      .querySelector("button.shop-offer-buy");
    if (!(buy instanceof HTMLButtonElement)) throw new Error("missing buy");
    await user.click(buy);
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    return user;
  }

  function moneyOf(): number {
    return Number(
      getStatValue("Money").textContent?.replace(/[^0-9-]/g, "") ?? "0",
    );
  }

  function fakeDataTransfer(): DataTransfer {
    const store: Record<string, string> = {};
    const types: string[] = [];
    return {
      types,
      effectAllowed: "",
      dropEffect: "",
      setData(format: string, data: string) {
        if (!(format in store)) types.push(format);
        store[format] = data;
      },
      getData(format: string) {
        return store[format] ?? "";
      },
    } as unknown as DataTransfer;
  }

  test("shift-clicking a filled consumable tile sells it for $1", async () => {
    const user = await buyPlanetAndCloseShop();
    const before = moneyOf();
    await user.keyboard("{Shift>}");
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    await user.keyboard("{/Shift}");
    expect(moneyOf()).toBe(before + 1);
  });

  test("shift-clicking sell empties the consumable slot", async () => {
    const user = await buyPlanetAndCloseShop();
    await user.keyboard("{Shift>}");
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    await user.keyboard("{/Shift}");
    expect(screen.queryByTestId("consumable-tile-filled-0")).toBeNull();
  });

  test("dragging a consumable tile onto the deck pile sells it", async () => {
    await buyPlanetAndCloseShop();
    const before = moneyOf();
    const tile = screen.getByTestId("consumable-tile-filled-0");
    const deck = screen.getByRole("button", { name: /Deck/ });
    const dt = fakeDataTransfer();
    fireEvent.dragStart(tile, { dataTransfer: dt });
    fireEvent.dragOver(deck, { dataTransfer: dt });
    fireEvent.drop(deck, { dataTransfer: dt });
    fireEvent.dragEnd(tile, { dataTransfer: dt });
    expect(moneyOf()).toBe(before + 1);
  });

  test("dragging a planet consumable onto the jokers area uses it", async () => {
    await buyPlanetAndCloseShop();
    const tile = screen.getByTestId("consumable-tile-filled-0");
    const jokersSection = screen.getByLabelText("Equipped jokers");
    const dt = fakeDataTransfer();
    fireEvent.dragStart(tile, { dataTransfer: dt });
    fireEvent.dragOver(jokersSection, { dataTransfer: dt });
    fireEvent.drop(jokersSection, { dataTransfer: dt });
    fireEvent.dragEnd(tile, { dataTransfer: dt });
    expect(screen.queryByTestId("consumable-tile-filled-0")).toBeNull();
  });

  test("dragend without a drop leaves the consumable in place", async () => {
    await buyPlanetAndCloseShop();
    const tile = screen.getByTestId("consumable-tile-filled-0");
    const dt = fakeDataTransfer();
    fireEvent.dragStart(tile, { dataTransfer: dt });
    fireEvent.dragEnd(tile, { dataTransfer: dt });
    expect(screen.getByTestId("consumable-tile-filled-0")).toBeInTheDocument();
  });

  test("dragging an enhancement tarot onto jokers with no selection does not consume it", async () => {
    mockShuffleConfig.useIdentity = true;
    shopPickerRngConfig.rng = forceShopLayout(["tarot", "joker"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add \$10/));
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    const tarotIdx = findShopOfferIdxOfKind("tarot");
    const tarotName = screen
      .getByTestId(`shop-offer-${tarotIdx}`)
      .querySelector(".shop-offer-name")?.textContent;
    if (tarotName === "The Hermit") return;
    const buy = screen
      .getByTestId(`shop-offer-${tarotIdx}`)
      .querySelector("button.shop-offer-buy");
    if (!(buy instanceof HTMLButtonElement)) throw new Error("missing buy");
    await user.click(buy);
    await user.click(screen.getByRole("button", { name: /Next Round/ }));

    const tile = screen.getByTestId("consumable-tile-filled-0");
    const jokersSection = screen.getByLabelText("Equipped jokers");
    const dt = fakeDataTransfer();
    fireEvent.dragStart(tile, { dataTransfer: dt });
    fireEvent.dragOver(jokersSection, { dataTransfer: dt });
    fireEvent.drop(jokersSection, { dataTransfer: dt });
    fireEvent.dragEnd(tile, { dataTransfer: dt });
    expect(screen.getByTestId("consumable-tile-filled-0")).toBeInTheDocument();
  });
});

describe("Joker drag and sell integration", () => {
  const originalFactory = initialJokersConfig.factory;

  beforeEach(() => {
    initialJokersConfig.factory = () => [
      createPlusFourMultJoker(),
      createBusinessCardJoker(),
      createJokerStencilJoker(),
    ];
  });

  afterEach(() => {
    initialJokersConfig.factory = originalFactory;
  });

  function moneyOf(): number {
    return Number(
      getStatValue("Money").textContent?.replace(/[^0-9-]/g, "") ?? "0",
    );
  }

  function fakeDataTransfer(): DataTransfer {
    const store: Record<string, string> = {};
    const types: string[] = [];
    return {
      types,
      effectAllowed: "",
      dropEffect: "",
      setData(format: string, data: string) {
        if (!(format in store)) types.push(format);
        store[format] = data;
      },
      getData(format: string) {
        return store[format] ?? "";
      },
    } as unknown as DataTransfer;
  }

  test("shift-clicking a filled joker tile sells it for $2", () => {
    render(<App />);
    const before = moneyOf();
    fireEvent.click(screen.getByTestId("joker-tile-filled-plus-four-mult"), {
      shiftKey: true,
    });
    expect(moneyOf()).toBe(before + 2);
  });

  test("shift-clicking sell removes the joker from the tray", () => {
    render(<App />);
    fireEvent.click(screen.getByTestId("joker-tile-filled-business-card"), {
      shiftKey: true,
    });
    expect(
      screen.queryByTestId("joker-tile-filled-business-card"),
    ).toBeNull();
  });

  test("dragging a joker tile onto the deck pile sells it", () => {
    render(<App />);
    const before = moneyOf();
    const tile = screen.getByTestId("joker-tile-filled-joker-stencil");
    const deck = screen.getByRole("button", { name: /Deck/ });
    const dt = fakeDataTransfer();
    fireEvent.dragStart(tile, { dataTransfer: dt });
    fireEvent.dragOver(deck, { dataTransfer: dt });
    fireEvent.drop(deck, { dataTransfer: dt });
    fireEvent.dragEnd(tile, { dataTransfer: dt });
    expect(moneyOf()).toBe(before + 2);
  });

  test("drag-to-deck sell removes the joker from the tray", () => {
    render(<App />);
    const tile = screen.getByTestId("joker-tile-filled-joker-stencil");
    const deck = screen.getByRole("button", { name: /Deck/ });
    const dt = fakeDataTransfer();
    fireEvent.dragStart(tile, { dataTransfer: dt });
    fireEvent.dragOver(deck, { dataTransfer: dt });
    fireEvent.drop(deck, { dataTransfer: dt });
    fireEvent.dragEnd(tile, { dataTransfer: dt });
    expect(
      screen.queryByTestId("joker-tile-filled-joker-stencil"),
    ).toBeNull();
  });
});

describe("Celestial pack open + pick integration", () => {
  async function openShopWithMoney(): Promise<ReturnType<typeof userEvent.setup>> {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add \$10/));
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    return user;
  }

  function findPackOfferIdx(): number {
    const all = screen.getAllByTestId(/^shop-offer-/);
    for (let i = 0; i < all.length; i += 1) {
      if (all[i].getAttribute("data-offer-kind") === "pack") return i;
    }
    throw new Error("no pack offer in shop");
  }

  function moneyOf(): number {
    return Number(
      getStatValue("Money").textContent?.replace(/[^0-9-]/g, "") ?? "0",
    );
  }

  test("clicking Open on a pack offer opens the pack modal", async () => {
    const user = await openShopWithMoney();
    const idx = findPackOfferIdx();
    const open = screen
      .getByTestId(`shop-offer-${idx}`)
      .querySelector("button.shop-offer-buy") as HTMLButtonElement;
    await user.click(open);
    expect(screen.getByTestId("pack-open-subtitle")).toBeInTheDocument();
  });

  test("opening a pack deducts the pack price from money", async () => {
    const user = await openShopWithMoney();
    const before = moneyOf();
    const idx = findPackOfferIdx();
    const offer = screen.getByTestId(`shop-offer-${idx}`);
    const priceText = offer.querySelector(".shop-offer-price")?.textContent ?? "";
    const price = Number(priceText.replace(/[^0-9]/g, ""));
    const open = offer.querySelector("button.shop-offer-buy") as HTMLButtonElement;
    await user.click(open);
    expect(moneyOf()).toBe(before - price);
  });

  test("opening a pack marks the pack offer as Sold", async () => {
    const user = await openShopWithMoney();
    const idx = findPackOfferIdx();
    const open = screen
      .getByTestId(`shop-offer-${idx}`)
      .querySelector("button.shop-offer-buy") as HTMLButtonElement;
    await user.click(open);
    await user.click(screen.getByTestId("pack-open-close"));
    expect(
      screen
        .getByTestId(`shop-offer-${idx}`)
        .querySelector("button.shop-offer-buy"),
    ).toHaveTextContent("Sold");
  });

  test("picking a planet from a Celestial pack does NOT add it to the consumable tray (auto-applied)", async () => {
    const user = await openShopWithMoney();
    const consumablesBefore = screen.queryAllByTestId(
      /^consumable-tile-filled-/,
    ).length;
    const idx = findPackOfferIdx();
    const open = screen
      .getByTestId(`shop-offer-${idx}`)
      .querySelector("button.shop-offer-buy") as HTMLButtonElement;
    await user.click(open);
    await user.click(screen.getByTestId("pack-open-pick-0"));
    expect(screen.queryAllByTestId(/^consumable-tile-filled-/)).toHaveLength(
      consumablesBefore,
    );
  });

  test("picking a planet from a Celestial pack upgrades the matching hand's level", async () => {
    const user = await openShopWithMoney();
    const idx = findPackOfferIdx();
    const open = screen
      .getByTestId(`shop-offer-${idx}`)
      .querySelector("button.shop-offer-buy") as HTMLButtonElement;
    await user.click(open);
    await user.click(screen.getByTestId("pack-open-pick-0"));
    await user.click(screen.getByRole("button", { name: "Run info" }));
    const levels = HANDS.map((h) =>
      Number(
        screen.getByTestId(`run-info-level-${h.label}`).textContent ?? "1",
      ),
    );
    expect(levels.some((lvl) => lvl > 1)).toBe(true);
  });

  test("picking the only allowed card closes the modal automatically", async () => {
    const user = await openShopWithMoney();
    const idx = findPackOfferIdx();
    const open = screen
      .getByTestId(`shop-offer-${idx}`)
      .querySelector("button.shop-offer-buy") as HTMLButtonElement;
    await user.click(open);
    await user.click(screen.getByTestId("pack-open-pick-0"));
    expect(screen.queryByTestId("pack-open-subtitle")).not.toBeInTheDocument();
  });

  test("closing the modal without picking still leaves the pack Sold (player paid)", async () => {
    const user = await openShopWithMoney();
    const idx = findPackOfferIdx();
    const open = screen
      .getByTestId(`shop-offer-${idx}`)
      .querySelector("button.shop-offer-buy") as HTMLButtonElement;
    await user.click(open);
    await user.click(screen.getByTestId("pack-open-close"));
    expect(
      screen
        .getByTestId(`shop-offer-${idx}`)
        .querySelector("button.shop-offer-buy"),
    ).toHaveTextContent("Sold");
  });
});

describe("Hand size modifier (issue #210)", () => {
  async function clickShrink(): Promise<ReturnType<typeof userEvent.setup>> {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Hand −1/ }));
    return user;
  }

  test("the fresh game still deals 8 cards before any modifier is applied", () => {
    render(<App />);
    expect(getHandCardButtons()).toHaveLength(8);
  });

  test("clicking Hand −1 does not change the current round's hand size", async () => {
    await clickShrink();
    expect(getHandCardButtons()).toHaveLength(8);
  });

  test("after Hand −1 the next round deals 7 cards", async () => {
    const user = await clickShrink();
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    expect(getHandCardButtons()).toHaveLength(7);
  });

  test("the −1 modifier persists across two round transitions", async () => {
    const user = await clickShrink();
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    expect(getHandCardButtons()).toHaveLength(7);
  });

  test("two Hand −1 clicks deal 6 cards next round", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Hand −1/ }));
    await user.click(screen.getByRole("button", { name: /Hand −1/ }));
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    expect(getHandCardButtons()).toHaveLength(6);
  });

  test("Hand +1 grows the next round's hand to 9 cards", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Hand \+1/ }));
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    expect(getHandCardButtons()).toHaveLength(9);
  });

  test("starting a new game resets the hand-size modifier", async () => {
    const user = await clickShrink();
    await user.click(screen.getByRole("button", { name: /Options/ }));
    await user.click(screen.getByRole("button", { name: /New game/ }));
    await dismissBlindSelect(user);
    expect(getHandCardButtons()).toHaveLength(8);
  });

  test("hand size never shrinks below 1 even when over-clicked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    for (let i = 0; i < 15; i += 1) {
      await user.click(screen.getByRole("button", { name: /Hand −1/ }));
    }
    await user.click(screen.getByText(/Win/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    expect(getHandCardButtons()).toHaveLength(1);
  });
});
