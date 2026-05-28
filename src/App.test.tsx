import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App, { getScoringStepMs } from "./App";
import {
  getAnimationSpeed,
  setAnimationSpeed,
} from "./components/system/preferences";
import { forceShopLayout, shopPickerRngConfig } from "./items/shop";
import { createTagCatalog, tagOfferRngConfig, type TagId } from "./items/tags";
import { createSpectralCatalog } from "./items/spectrals";
import type { VoucherId } from "./items/vouchers";
import {
  MAX_JOKERS,
  createBusinessCardJoker,
  createGreedyJoker,
  createJokerStencilJoker,
  createPhotographJoker,
  createPlusFourMultJoker,
  initialJokersConfig,
} from "./items/jokers";
import { chanceOverrideConfig } from "./dev/chanceOverride";
import {
  dismissBlindSelect,
  dragCardToGap,
  findShopOfferIdxOfKind,
  flushDiscardAnimation,
  flushScoringSequence,
  getHandCardButtons,
  getStatValue,
  mockDeckConfig,
  mockShuffleConfig,
  playMock,
  resetHighVisibility,
  setupAppTestEnvironment,
} from "./App.test-helpers";

vi.mock("./components/system/sounds", () => ({ play: vi.fn() }));

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

setupAppTestEnvironment();

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
    await user.click(screen.getByText(/^🏆 Win$/));
    // Dev Win now opens the post-round shop; skip through it and the
    // blind-select screen to reach the next-round deal.
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    expect(
      screen.getByRole("button", { name: /Deck \(44 cards remaining\)/ })
    ).toBeInTheDocument();
  });

  test("replenishes the full deck while the shop is displayed", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    await user.click(getHandCardButtons()[0]);
    await user.click(getHandCardButtons()[1]);
    await user.click(screen.getByText(/^🗑️ Discard$/));
    flushDiscardAnimation();
    await user.click(screen.getByText(/^🏆 Win$/));
    expect(
      screen.getByRole("button", { name: /Deck \(52 cards remaining\)/ })
    ).toBeInTheDocument();
  });

  test("keeps the hand at 8 cards after a win resets the deck", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/^🏆 Win$/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    expect(getHandCardButtons()).toHaveLength(8);
  });

  test("clears any in-flight card selection on win", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    await user.click(getHandCardButtons()[0]);
    await user.click(screen.getByText(/^🏆 Win$/));
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
    await user.click(screen.getByText(/^🏆 Win$/));
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

    await user.click(screen.getByText(/^🏆 Win$/));
    expect(screen.getByText("Big Blind")).toBeInTheDocument();
    expect(screen.getByText("Score at least: 450")).toBeInTheDocument();
    expect(getStatValue("Money")).toHaveTextContent("$7");
    expect(getStatValue("Round")).toHaveTextContent("2");

    await user.click(screen.getByText(/^🏆 Win$/));
    expect(screen.getByText("Boss Blind")).toBeInTheDocument();
    expect(getStatValue("Money")).toHaveTextContent("$12");

    await user.click(screen.getByText(/^🏆 Win$/));
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
  test("dev Add Chips bump resets after Submit Hand (per-hand reset, #265)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add Chips/));
    await user.click(screen.getByText(/Submit Hand/));
    expect(document.querySelector(".chips")).toHaveTextContent("0");
  });

  test("dev Add Multiplier bump resets after Submit Hand (per-hand reset, #265)", async () => {
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

    await user.click(screen.getByText(/^🏆 Win$/));
    await user.click(screen.getByText(/^🏆 Win$/));
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

  test("cancelling the New game confirm leaves the current run intact (issue #269)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/^💵 Add \$10$/));
    expect(getStatValue("Money")).toHaveTextContent("$14");

    vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    await user.click(screen.getByText("Options"));
    await user.click(screen.getByText("New game"));

    expect(getStatValue("Money")).toHaveTextContent("$14");
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

  test("clicking Continue credits base + interest on the interest wallet (#353)", async () => {
    // Pre-win wallet = $4. Gold bonus = $3 (one held 2♠ gold default).
    // Remaining hands bonus = 3 hands × $1 = $3 (won on hand 1 of 4).
    // Visible wallet at modal = $10, but the interest wallet excludes the
    // remaining-hands bonus, so interest is on $7 only.
    // Interest = floor(7/5) = $1. Continue adds base ($3) + interest ($1).
    // Final = $4 + $3 + $3 + $3 + $1 = $14.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await triggerWin();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    expect(getStatValue("Money")).toHaveTextContent("$14");
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

  test("modal interest is calculated on the gold-augmented wallet, excluding remaining-hands (#353)", async () => {
    // $4 + $3 gold = $7 (no remaining-hands). floor($7/$5) = $1.
    await triggerWin();
    expect(screen.getByTestId("round-won-interest")).toHaveTextContent("+$1");
  });

  test("modal interest label reflects the interest wallet (excludes remaining-hands, #353)", async () => {
    await triggerWin();
    expect(screen.getByTestId("round-won-interest-label")).toHaveTextContent(
      "on $7",
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
    // base $3 + gold $3 + hands $3 + interest $1 = $10.
    await triggerWin();
    expect(screen.getByTestId("round-won-total")).toHaveTextContent("$10");
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

  test.each<{ speed: "normal" | "slow" | "fast" | "instant"; reducedMotion: boolean; expected: number }>([
    { speed: "normal", reducedMotion: false, expected: 500 },
    { speed: "slow", reducedMotion: false, expected: 1000 },
    { speed: "fast", reducedMotion: false, expected: 250 },
    { speed: "instant", reducedMotion: false, expected: 0 },
    { speed: "normal", reducedMotion: true, expected: 0 },
    { speed: "fast", reducedMotion: true, expected: 250 },
    { speed: "slow", reducedMotion: true, expected: 1000 },
  ])("returns $expected for $speed when reducedMotion=$reducedMotion", ({ speed, reducedMotion, expected }) => {
    mockPrefersReducedMotion(reducedMotion);
    expect(getScoringStepMs(speed)).toBe(expected);
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
    await user.click(screen.getByRole("button", { name: /Reroll shop offers/ }));
    const moneyAfter = Number(
      getStatValue("Money").textContent?.replace(/[^0-9-]/g, "") ?? "0",
    );
    expect(moneyAfter).toBe(moneyBefore - 5);
  });

  test("after one reroll the button shows $6", async () => {
    const user = await openShop();
    await user.click(screen.getByRole("button", { name: /Reroll shop offers/ }));
    expect(screen.getByRole("button", { name: /Reroll shop offers/ })).toHaveTextContent(
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
    await user.click(screen.getByRole("button", { name: /Reroll shop offers/ }));
    const after = screen
      .getAllByTestId(/^shop-offer-/)
      .map((el) => el.querySelector(".shop-offer-name")?.textContent ?? "");
    randomSpy.mockRestore();
    expect(after).not.toEqual(before);
  });

  test("Reroll replaces already-sold offers with fresh Buy buttons (#267)", async () => {
    const user = await openShop();
    const buy = screen
      .getByTestId("shop-offer-0")
      .querySelector("button.shop-offer-buy");
    if (!(buy instanceof HTMLButtonElement)) throw new Error("missing buy");
    await user.click(buy);
    await user.click(screen.getByRole("button", { name: /Reroll shop offers/ }));
    const afterButton = screen
      .getByTestId("shop-offer-0")
      .querySelector("button.shop-offer-buy");
    expect(afterButton?.textContent).not.toMatch(/Sold/);
  });

  function packNames(): ReadonlyArray<string> {
    return Array.from(
      document.querySelectorAll<HTMLElement>("[data-offer-kind='pack']"),
    ).map((el) => el.querySelector(".shop-offer-name")?.textContent ?? "");
  }

  test("Reroll does not change the pack offer names (#374)", async () => {
    const user = await openShop();
    const before = packNames();
    await user.click(screen.getByRole("button", { name: /Reroll shop offers/ }));
    expect(packNames()).toEqual(before);
  });

  test("Reroll preserves the number of pack offers (#374)", async () => {
    const user = await openShop();
    const beforeCount = packNames().length;
    await user.click(screen.getByRole("button", { name: /Reroll shop offers/ }));
    expect(packNames().length).toBe(beforeCount);
  });

  test("Reroll preserves the Sold state of a previously bought pack (#374)", async () => {
    const user = await openShop();
    const packOffer = document.querySelector<HTMLElement>(
      "[data-offer-kind='pack']",
    );
    if (!packOffer) throw new Error("expected a pack offer");
    const buy = packOffer.querySelector("button.shop-offer-buy");
    if (!(buy instanceof HTMLButtonElement)) throw new Error("missing buy");
    await user.click(buy);
    await user.click(screen.getByTestId("pack-open-close"));
    await user.click(screen.getByRole("button", { name: /Reroll shop offers/ }));
    const afterPack = document.querySelector<HTMLElement>(
      "[data-offer-kind='pack']",
    );
    expect(
      afterPack?.querySelector("button.shop-offer-buy")?.textContent,
    ).toMatch(/Sold/);
  });

  test("Reroll is disabled when the player can't afford it", async () => {
    const user = await openShop();
    await user.click(screen.getByRole("button", { name: /Reroll shop offers/ }));
    await user.click(screen.getByRole("button", { name: /Reroll shop offers/ }));
    await user.click(screen.getByRole("button", { name: /Reroll shop offers/ }));
    await user.click(screen.getByRole("button", { name: /Reroll shop offers/ }));
    expect(screen.getByRole("button", { name: /Reroll shop offers/ })).toBeDisabled();
  });

  test("clicking Reroll when disabled is a no-op on money", async () => {
    const user = await openShop();
    await user.click(screen.getByRole("button", { name: /Reroll shop offers/ }));
    await user.click(screen.getByRole("button", { name: /Reroll shop offers/ }));
    await user.click(screen.getByRole("button", { name: /Reroll shop offers/ }));
    await user.click(screen.getByRole("button", { name: /Reroll shop offers/ }));
    const moneyBefore = getStatValue("Money").textContent;
    await user.click(screen.getByRole("button", { name: /Reroll shop offers/ }));
    expect(getStatValue("Money").textContent).toBe(moneyBefore);
  });

  test("opening a new shop after the next round resets the reroll cost to $5", async () => {
    const user = await openShop();
    await user.click(screen.getByRole("button", { name: /Reroll shop offers/ }));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await user.click(screen.getByText(/Add \$10/));
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByRole("button", { name: /Reroll shop offers/ })).toHaveTextContent(
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
    await dismissBlindSelect(user);
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
    await dismissBlindSelect(user);
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
    await dismissBlindSelect(user);
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
    await dismissBlindSelect(user);
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
    const buy = screen.getByTestId("shop-voucher-buy-0");
    await user.click(buy);
    expect(moneyValue()).toBe(before - 10);
  });

  test("buying the voucher marks the voucher slot as Sold", async () => {
    const user = await openShop();
    await user.click(screen.getByTestId("shop-voucher-buy-0"));
    expect(screen.getByTestId("shop-voucher-buy-0")).toHaveTextContent("Sold");
  });

  test("clicking Reroll does not change the voucher's name", async () => {
    const user = await openShop();
    const slot = screen.getByTestId("shop-voucher");
    const before = slot.querySelector(".shop-voucher-name")?.textContent ?? "";
    await user.click(screen.getByRole("button", { name: /Reroll shop offers/ }));
    const after =
      screen.getByTestId("shop-voucher").querySelector(".shop-voucher-name")
        ?.textContent ?? "";
    expect(after).toBe(before);
  });

  test("clicking Reroll does not clear the voucher Sold state", async () => {
    const user = await openShop();
    await user.click(screen.getByTestId("shop-voucher-buy-0"));
    await user.click(screen.getByRole("button", { name: /Reroll shop offers/ }));
    expect(screen.getByTestId("shop-voucher-buy-0")).toHaveTextContent("Sold");
  });

  test("the voucher remains Sold across blinds within the same ante", async () => {
    const user = await openShop();
    await user.click(screen.getByTestId("shop-voucher-buy-0"));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await user.click(screen.getByText(/Add \$10/));
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    expect(screen.getByTestId("shop-voucher-buy-0")).toHaveTextContent("Sold");
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

  test("the dev override picker replaces the offered voucher with the chosen one", async () => {
    const user = await openShopWithVoucher(0);
    await user.selectOptions(
      screen.getByTestId("shop-voucher-override"),
      "crystal-ball",
    );
    expect(
      screen.getByTestId("shop-voucher").querySelector(".shop-voucher-name"),
    ).toHaveTextContent("Crystal Ball");
  });

  test("buying Overstock raises the next shop's item offer count from 2 to 3", async () => {
    const user = await openShopWithVoucher(0);
    await user.click(screen.getByTestId("shop-voucher-buy-0"));
    await winAndReopenShop(user);
    const items = screen
      .getAllByTestId(/^shop-offer-/)
      .filter((el) => el.getAttribute("data-offer-kind") !== "pack");
    expect(items).toHaveLength(3);
  });

  function itemOfferTiles(): HTMLElement[] {
    return screen
      .getAllByTestId(/^shop-offer-/)
      .filter((el) => el.getAttribute("data-offer-kind") !== "pack");
  }

  test("buying Overstock immediately expands the current shop from 2 to 3 items (#301)", async () => {
    const user = await openShopWithVoucher(0);
    expect(itemOfferTiles()).toHaveLength(2);
    await user.click(screen.getByTestId("shop-voucher-buy-0"));
    expect(itemOfferTiles()).toHaveLength(3);
  });

  test("the newly-appended Overstock offer is not a duplicate of an existing item (#301)", async () => {
    const user = await openShopWithVoucher(0);
    const beforeNames = itemOfferTiles().map(
      (tile) => tile.querySelector(".shop-offer-name")?.textContent ?? "",
    );
    await user.click(screen.getByTestId("shop-voucher-buy-0"));
    const afterNames = itemOfferTiles().map(
      (tile) => tile.querySelector(".shop-offer-name")?.textContent ?? "",
    );
    const newOffer = afterNames[afterNames.length - 1];
    expect(beforeNames).not.toContain(newOffer);
  });

  test("Sold items survive an Overstock-driven expansion (#301)", async () => {
    const user = await openShopWithVoucher(0);
    const firstTile = itemOfferTiles()[0];
    const buyButton = firstTile.querySelector("button.shop-offer-buy");
    if (!(buyButton instanceof HTMLButtonElement)) throw new Error("missing buy");
    const soldName = firstTile.querySelector(".shop-offer-name")?.textContent;
    await user.click(buyButton);
    await user.click(screen.getByTestId("shop-voucher-buy-0"));
    const stillSoldName = itemOfferTiles()[0].querySelector(".shop-offer-name")
      ?.textContent;
    expect(stillSoldName).toBe(soldName);
  });

  test("buying Clearance Sale shows a discounted joker price on the existing offer", async () => {
    const user = await openShopWithVoucher(0.15);
    await user.click(screen.getByTestId("shop-voucher-buy-0"));
    const joker = screen
      .getByTestId(`shop-offer-${findShopOfferIdxOfKind("joker")}`)
      .querySelector(".shop-offer-price-discounted");
    expect(joker).toHaveTextContent("$4");
  });

  test("buying Clearance Sale lets the player afford a joker they couldn't at full price", async () => {
    const user = await openShopWithVoucher(0.15);
    const jokerSlotId = `shop-offer-${findShopOfferIdxOfKind("joker")}`;
    const buyButton = screen
      .getByTestId(jokerSlotId)
      .querySelector("button.shop-offer-buy");
    if (!(buyButton instanceof HTMLButtonElement)) throw new Error("missing joker buy");
    expect(buyButton).not.toBeDisabled();
    await user.click(screen.getByTestId("shop-voucher-buy-0"));
    expect(buyButton).not.toBeDisabled();
  });

  test("buying Crystal Ball adds a third consumable slot to the tray", async () => {
    const user = await openShopWithVoucher(0.25);
    await user.click(screen.getByTestId("shop-voucher-buy-0"));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    expect(screen.getAllByTestId("consumable-tile-empty")).toHaveLength(3);
  });

  function handsValue(): number {
    return Number(
      getStatValue("Hands").textContent?.replace(/[^0-9-]/g, "") ?? "0",
    );
  }

  function discardsValue(): number {
    return Number(
      getStatValue("Discards").textContent?.replace(/[^0-9-]/g, "") ?? "0",
    );
  }

  async function overrideVoucher(
    user: ReturnType<typeof userEvent.setup>,
    id: VoucherId,
  ): Promise<void> {
    await user.selectOptions(screen.getByTestId("shop-voucher-override"), id);
  }

  test("buying Grabber immediately adds 1 to the remaining hands (#426)", async () => {
    const user = await openShopWithVoucher(0);
    await overrideVoucher(user, "grabber");
    const before = handsValue();
    await user.click(screen.getByTestId("shop-voucher-buy-0"));
    expect(handsValue()).toBe(before + 1);
  });

  test("buying Nacho Tong after Grabber raises remaining hands by 2 total (#426)", async () => {
    const user = await openShopWithVoucher(0);
    const before = handsValue();
    await overrideVoucher(user, "grabber");
    await user.click(screen.getByTestId("shop-voucher-buy-0"));
    await overrideVoucher(user, "nacho-tong");
    await user.click(screen.getByTestId("shop-voucher-buy-0"));
    expect(handsValue()).toBe(before + 2);
  });

  test("buying Wasteful immediately adds 1 to the remaining discards (#426)", async () => {
    const user = await openShopWithVoucher(0);
    await overrideVoucher(user, "wasteful");
    const before = discardsValue();
    await user.click(screen.getByTestId("shop-voucher-buy-0"));
    expect(discardsValue()).toBe(before + 1);
  });

  test("buying Recyclomancy after Wasteful raises remaining discards by 2 total (#426)", async () => {
    const user = await openShopWithVoucher(0);
    const before = discardsValue();
    await overrideVoucher(user, "wasteful");
    await user.click(screen.getByTestId("shop-voucher-buy-0"));
    await overrideVoucher(user, "recyclomancy");
    await user.click(screen.getByTestId("shop-voucher-buy-0"));
    expect(discardsValue()).toBe(before + 2);
  });

  test("buying a non-hand voucher leaves the remaining hands unchanged (#426)", async () => {
    const user = await openShopWithVoucher(0);
    await overrideVoucher(user, "clearance-sale");
    const before = handsValue();
    await user.click(screen.getByTestId("shop-voucher-buy-0"));
    expect(handsValue()).toBe(before);
  });

  test("buying a non-discard voucher leaves the remaining discards unchanged (#426)", async () => {
    const user = await openShopWithVoucher(0);
    await overrideVoucher(user, "clearance-sale");
    const before = discardsValue();
    await user.click(screen.getByTestId("shop-voucher-buy-0"));
    expect(discardsValue()).toBe(before);
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
    await user.click(screen.getByText(/^🏆 Win$/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    expect(getHandCardButtons()).toHaveLength(7);
  });

  test("the −1 modifier persists across two round transitions", async () => {
    const user = await clickShrink();
    await user.click(screen.getByText(/^🏆 Win$/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    await user.click(screen.getByText(/^🏆 Win$/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    expect(getHandCardButtons()).toHaveLength(7);
  });

  test("two Hand −1 clicks deal 6 cards next round", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Hand −1/ }));
    await user.click(screen.getByRole("button", { name: /Hand −1/ }));
    await user.click(screen.getByText(/^🏆 Win$/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    expect(getHandCardButtons()).toHaveLength(6);
  });

  test("Hand +1 grows the next round's hand to 9 cards", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Hand \+1/ }));
    await user.click(screen.getByText(/^🏆 Win$/));
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
    await user.click(screen.getByText(/^🏆 Win$/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    expect(getHandCardButtons()).toHaveLength(1);
  });
});

describe("Blind-select skip (issue #251)", () => {
  test("clicking Skip on Small Blind advances the current blind to Big", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(screen.getByTestId("blind-select-play")).toHaveTextContent(
      "Play Big Blind",
    );
  });

  test("clicking Skip on Big Blind advances to Boss", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(screen.getByTestId("blind-select-play")).toHaveTextContent("Play ");
    expect(screen.queryByTestId("blind-select-skip")).not.toBeInTheDocument();
  });

  test("skipping does not change money", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const before = getStatValue("Money").textContent;
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(getStatValue("Money").textContent).toBe(before);
  });

  test("skipping increments the round counter", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    expect(getStatValue("Round")).toHaveTextContent("1");
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(getStatValue("Round")).toHaveTextContent("2");
  });

  test("the blind-select screen stays open after a skip", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(screen.getByTestId("blind-select-play")).toBeInTheDocument();
  });
});

describe("Investment tag (issue #252)", () => {
  test("skipping Small grants one Investment tag visible on the screen", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(screen.getAllByTestId(/^blind-select-tag-/)).toHaveLength(1);
  });

  test("skipping Small then Big grants two Investment tags", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(screen.getAllByTestId(/^blind-select-tag-/)).toHaveLength(2);
  });

  test("defeating the Boss while holding two Investment tags adds at least $50", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    await user.click(screen.getByTestId("blind-select-skip"));
    await user.click(screen.getByTestId("blind-select-play"));
    const before = Number(
      getStatValue("Money").textContent?.replace(/[^0-9-]/g, "") ?? "0",
    );
    await user.click(screen.getByText(/^🏆 Win$/));
    const after = Number(
      getStatValue("Money").textContent?.replace(/[^0-9-]/g, "") ?? "0",
    );
    expect(after - before).toBeGreaterThanOrEqual(50);
  });

  test("defeating the Boss consumes the held tags", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    await user.click(screen.getByTestId("blind-select-skip"));
    await user.click(screen.getByTestId("blind-select-play"));
    await user.click(screen.getByText(/^🏆 Win$/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    expect(screen.queryByTestId("blind-select-tags")).not.toBeInTheDocument();
  });

  test("winning a non-Boss round does NOT consume a held Investment tag", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    await user.click(screen.getByTestId("blind-select-play"));
    await user.click(screen.getByText(/^🏆 Win$/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    expect(screen.getAllByTestId(/^blind-select-tag-/)).toHaveLength(1);
  });

  test("starting a new game clears held tags", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    await user.click(screen.getByRole("button", { name: /Options/ }));
    await user.click(screen.getByRole("button", { name: /New game/ }));
    expect(screen.queryByTestId("blind-select-tags")).not.toBeInTheDocument();
  });
});

describe("Apply Modifiers — Packs +1 / Packs −1 dev controls", () => {
  function packOfferCount(): number {
    return document.querySelectorAll('[data-offer-kind="pack"]').length;
  }

  async function advanceToShop(
    user: ReturnType<typeof userEvent.setup>,
  ): Promise<void> {
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
  }

  test("the fresh game still shows the default number of pack offers in the first shop", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToShop(user);
    expect(packOfferCount()).toBe(2);
  });

  test("clicking Packs +1 adds one extra pack offer to the next shop", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Packs \+1/ }));
    await advanceToShop(user);
    expect(packOfferCount()).toBe(3);
  });

  test("clicking Packs +1 twice adds two extra pack offers to the next shop", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Packs \+1/ }));
    await user.click(screen.getByRole("button", { name: /Packs \+1/ }));
    await advanceToShop(user);
    expect(packOfferCount()).toBe(4);
  });

  test("clicking Packs −1 from the default removes one pack offer from the next shop", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Packs −1/ }));
    await advanceToShop(user);
    expect(packOfferCount()).toBe(1);
  });

  test("Packs −1 clamps at zero pack offers (never goes negative)", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    for (let i = 0; i < 10; i += 1) {
      await user.click(screen.getByRole("button", { name: /Packs −1/ }));
    }
    await advanceToShop(user);
    expect(packOfferCount()).toBe(0);
  });

  test("starting a new game resets the pack-slot modifier", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Packs \+1/ }));
    await user.click(screen.getByRole("button", { name: /Options/ }));
    await user.click(screen.getByRole("button", { name: /New game/ }));
    await dismissBlindSelect(user);
    await advanceToShop(user);
    expect(packOfferCount()).toBe(2);
  });
});

describe("Apply Modifiers — Vouchers +1 / Vouchers −1 dev controls", () => {
  function voucherCount(): number {
    return document.querySelectorAll("[data-voucher-id]").length;
  }

  async function advanceToShop(
    user: ReturnType<typeof userEvent.setup>,
  ): Promise<void> {
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
  }

  test("the fresh game shows exactly one voucher slot by default", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await advanceToShop(user);
    expect(voucherCount()).toBe(1);
  });

  test("clicking Vouchers +1 adds an extra voucher slot to the current shop", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Vouchers \+1/ }));
    await advanceToShop(user);
    expect(voucherCount()).toBe(2);
  });

  test("clicking Vouchers +1 twice adds two extra voucher slots", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Vouchers \+1/ }));
    await user.click(screen.getByRole("button", { name: /Vouchers \+1/ }));
    await advanceToShop(user);
    expect(voucherCount()).toBe(3);
  });

  test("clicking Vouchers −1 from the default removes the voucher slot", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Vouchers −1/ }));
    await advanceToShop(user);
    expect(voucherCount()).toBe(0);
  });

  test("Vouchers −1 clamps at zero (never goes negative)", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    for (let i = 0; i < 5; i += 1) {
      await user.click(screen.getByRole("button", { name: /Vouchers −1/ }));
    }
    await advanceToShop(user);
    expect(voucherCount()).toBe(0);
  });

  test("starting a new game resets the voucher-slot modifier", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Vouchers \+1/ }));
    await user.click(screen.getByRole("button", { name: /Options/ }));
    await user.click(screen.getByRole("button", { name: /New game/ }));
    await dismissBlindSelect(user);
    await advanceToShop(user);
    expect(voucherCount()).toBe(1);
  });
});

describe("Apply Modifiers — dev chips/mult offsets are sticky (#265)", () => {
  test("Add Chips bump survives toggling a card into the selection", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add Chips/));
    await user.click(getHandCardButtons()[0]);
    expect(document.querySelector(".chips")).toHaveTextContent(/^\d+$/);
    const chips = Number(document.querySelector(".chips")?.textContent ?? "0");
    expect(chips).toBeGreaterThanOrEqual(10);
  });

  test("Add Multiplier bump survives toggling a card into the selection", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add Multiplier/));
    await user.click(getHandCardButtons()[0]);
    const mult = Number(document.querySelector(".multiplier")?.textContent ?? "0");
    // Base High Card mult is 1; +1 dev bump means at least 2.
    expect(mult).toBeGreaterThanOrEqual(2);
  });

  test("Multiply Multiplier factor survives toggling a card", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Multiply Multiplier/));
    await user.click(getHandCardButtons()[0]);
    const mult = Number(document.querySelector(".multiplier")?.textContent ?? "0");
    // Base High Card mult is 1; ×2 dev factor means at least 2.
    expect(mult).toBeGreaterThanOrEqual(2);
  });

  test("starting a new game resets the dev offsets to zero", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add Chips/));
    await user.click(screen.getByText(/Add Multiplier/));
    await user.click(screen.getByText(/Multiply Multiplier/));
    await user.click(screen.getByRole("button", { name: /Options/ }));
    await user.click(screen.getByRole("button", { name: /New game/ }));
    expect(document.querySelector(".chips")).toHaveTextContent("0");
    expect(document.querySelector(".multiplier")).toHaveTextContent("0");
  });

  test("Add Chips bump appears as a +N Chips entry in the scoring trace", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add Chips/));
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    expect(document.querySelector(".scoring-trace")).toHaveTextContent(
      /\+10 Chips \(Apply Modifiers \(dev\)\)/,
    );
  });

  test("Multiply Multiplier appears as a ×N Mult entry in the scoring trace", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Multiply Multiplier/));
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    expect(document.querySelector(".scoring-trace")).toHaveTextContent(
      /×2 Mult \(Apply Modifiers \(dev\)\)/,
    );
  });

  test("Add Multiplier bumps the final round score (folded into scoring, #265)", async () => {
    mockShuffleConfig.useIdentity = true;
    const userA = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { unmount } = render(<App />);
    const cardsA = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await userA.click(cardsA[i]);
    await userA.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    const baseline = Number(
      document.querySelector(".round-score-value")?.textContent ?? "0",
    );
    unmount();

    mockShuffleConfig.useIdentity = true;
    const userB = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await userB.click(screen.getByText(/Add Multiplier/));
    const cardsB = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await userB.click(cardsB[i]);
    await userB.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    const withDev = Number(
      document.querySelector(".round-score-value")?.textContent ?? "0",
    );
    expect(withDev).toBeGreaterThan(baseline);
  });

  test("Multiply Multiplier doubles the final round score (folded into scoring, #265)", async () => {
    mockShuffleConfig.useIdentity = true;
    const userA = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { unmount } = render(<App />);
    const cardsA = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await userA.click(cardsA[i]);
    await userA.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    const baseline = Number(
      document.querySelector(".round-score-value")?.textContent ?? "0",
    );
    unmount();

    mockShuffleConfig.useIdentity = true;
    const userB = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await userB.click(screen.getByText(/Multiply Multiplier/));
    const cardsB = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await userB.click(cardsB[i]);
    await userB.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    const withDev = Number(
      document.querySelector(".round-score-value")?.textContent ?? "0",
    );
    expect(withDev).toBe(baseline * 2);
  });
});

describe("Shop is rendered inline in the hand slot (#370)", () => {
  async function openShop(): Promise<ReturnType<typeof userEvent.setup>> {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    return user;
  }

  test("shop renders as an inline section (no .shop-overlay wrapper)", async () => {
    await openShop();
    expect(document.querySelector(".shop-overlay")).toBeNull();
  });

  test("shop does not carry aria-modal attribute", async () => {
    await openShop();
    expect(
      screen.getByRole("region", { name: /Shop/ }),
    ).not.toHaveAttribute("aria-modal");
  });

  test("the player's hand is NOT in the document while the shop is open", async () => {
    await openShop();
    expect(screen.queryByLabelText("Your hand")).not.toBeInTheDocument();
  });

  test("the Submit Hand button is NOT in the document while the shop is open", async () => {
    await openShop();
    expect(screen.queryByText(/Submit Hand/)).not.toBeInTheDocument();
  });

  test("the jokers row remains queryable while the shop is open", async () => {
    await openShop();
    expect(screen.getByLabelText("Equipped jokers")).toBeInTheDocument();
  });

  test("dismissing the shop re-mounts the hand", async () => {
    const user = await openShop();
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    expect(screen.getByLabelText("Your hand")).toBeInTheDocument();
  });
});

describe("Pack-pick is rendered inline (#370 Phase 2)", () => {
  async function openShopThenPack(): Promise<ReturnType<typeof userEvent.setup>> {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add \$10/));
    await dismissBlindSelect(user);
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    const offers = screen.getAllByTestId(/^shop-offer-/);
    const packIdx = offers.findIndex(
      (el) => el.getAttribute("data-offer-kind") === "pack",
    );
    const openBtn = offers[packIdx].querySelector(
      "button.shop-offer-buy",
    ) as HTMLButtonElement;
    await user.click(openBtn);
    return user;
  }

  function moneyValue(): number {
    return Number(
      getStatValue("Money").textContent?.replace(/[^0-9-]/g, "") ?? "0",
    );
  }

  function nonPackBuyButtons(): HTMLButtonElement[] {
    const all = document.querySelectorAll<HTMLButtonElement>(
      "button.shop-offer-buy",
    );
    return Array.from(all).filter((b) => !/Open/i.test(b.textContent ?? ""));
  }

  test("pack-pick renders without a .pack-open-overlay wrapper", async () => {
    await openShopThenPack();
    expect(document.querySelector(".pack-open-overlay")).toBeNull();
  });

  test("pack-pick does not carry aria-modal", async () => {
    await openShopThenPack();
    const region = document
      .querySelector("[aria-labelledby='pack-open-title']") as HTMLElement | null;
    expect(region).not.toHaveAttribute("aria-modal");
  });

  test("the player's hand is NOT in the document while a pack-pick is open", async () => {
    await openShopThenPack();
    expect(screen.queryByLabelText("Your hand")).not.toBeInTheDocument();
  });

  test("the jokers row remains queryable while a pack-pick is open", async () => {
    await openShopThenPack();
    expect(screen.getByLabelText("Equipped jokers")).toBeInTheDocument();
  });

  test("the consumables tray remains queryable while a pack-pick is open", async () => {
    await openShopThenPack();
    expect(screen.getByLabelText("Consumable slots")).toBeInTheDocument();
  });

  test("non-pack shop offer Buy buttons are disabled while a pack-pick is open", async () => {
    await openShopThenPack();
    const buys = nonPackBuyButtons();
    expect(buys.every((b) => b.disabled)).toBe(true);
  });

  test("shop Reroll button is disabled while a pack-pick is open", async () => {
    await openShopThenPack();
    expect(
      screen.getByRole("button", { name: /Reroll shop offers/i }),
    ).toBeDisabled();
  });

  test("shop Next Round button is disabled while a pack-pick is open", async () => {
    await openShopThenPack();
    expect(
      screen.getByRole("button", { name: /Next Round/i }),
    ).toBeDisabled();
  });

  test("shop Voucher Buy button is disabled while a pack-pick is open", async () => {
    await openShopThenPack();
    expect(screen.getByTestId("shop-voucher-buy-0")).toBeDisabled();
  });

  test("clicking a locked shop Buy button while pack-pick is open does NOT change money", async () => {
    const user = await openShopThenPack();
    const before = moneyValue();
    const buys = nonPackBuyButtons();
    if (buys[0]) await user.click(buys[0]);
    expect(moneyValue()).toBe(before);
  });

  test("closing the pack-pick re-enables the Next Round button", async () => {
    const user = await openShopThenPack();
    await user.click(screen.getByTestId("pack-open-close"));
    expect(
      screen.getByRole("button", { name: /Next Round/i }),
    ).not.toBeDisabled();
  });
});

describe("Apply Modifiers — Force Probabilities toggle (#354)", () => {
  test("renders a Force Probabilities button labelled 'On' by default", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: /Force Probabilities On/ }),
    ).toBeInTheDocument();
  });

  test("the button defaults to aria-pressed=false", () => {
    render(<App />);
    expect(
      screen.getByRole("button", { name: /Force Probabilities/ }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  test("clicking the button flips aria-pressed to true", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Force Probabilities/ }));
    expect(
      screen.getByRole("button", { name: /Force Probabilities/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  test("clicking the button updates the global chance override", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Force Probabilities/ }));
    expect(chanceOverrideConfig.force100).toBe(true);
  });

  test("clicking the button twice toggles the override back off", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Force Probabilities/ }));
    await user.click(screen.getByRole("button", { name: /Force Probabilities/ }));
    expect(chanceOverrideConfig.force100).toBe(false);
  });

  test("starting a new game resets the toggle and the override", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Force Probabilities/ }));
    expect(chanceOverrideConfig.force100).toBe(true);
    await user.click(screen.getByRole("button", { name: /Options/ }));
    await user.click(screen.getByRole("button", { name: /New game/ }));
    expect(chanceOverrideConfig.force100).toBe(false);
  });
});

describe("Per-run stat counters", () => {
  const appRoot = (container: HTMLElement): HTMLElement =>
    container.querySelector(".App") as HTMLElement;

  test("the hands-played counter starts at zero before any hand is played (negative)", () => {
    const { container } = render(<App />);
    expect(appRoot(container)).toHaveAttribute("data-hands-played", "0");
  });

  test("playing a hand increments the per-run hands-played counter", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = render(<App />);
    await user.click(getHandCardButtons()[0]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    expect(appRoot(container)).toHaveAttribute("data-hands-played", "1");
  });

  test("skipping a blind increments the per-run blinds-skipped counter", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = render(<App />);
    await user.click(screen.getByText(/^🏆 Win$/));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(appRoot(container)).toHaveAttribute("data-blinds-skipped", "1");
  });

  test("winning a blind accumulates the leftover discards into the per-run counter", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = render(<App />);
    const leftover = getStatValue("Discards").querySelector(".stat-value")?.textContent;
    await user.click(screen.getByText(/^🏆 Win$/));
    expect(appRoot(container)).toHaveAttribute("data-unused-discards", leftover ?? "");
  });

  test("starting a new game resets the per-run counters to zero", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = render(<App />);
    await user.click(screen.getByText(/^🏆 Win$/));
    await user.click(screen.getByRole("button", { name: /Options/ }));
    await user.click(screen.getByRole("button", { name: /New game/ }));
    expect(appRoot(container)).toHaveAttribute("data-unused-discards", "0");
  });
});

describe("Skip tag offers", () => {
  test("the blind-select shows a rolled skip-reward on the Small Blind row", () => {
    render(<App />);
    expect(
      screen.getByTestId("blind-select-row-skip-reward-1"),
    ).toHaveTextContent("Investment Tag");
  });

  test("the blind-select shows a rolled skip-reward on the Big Blind row", () => {
    render(<App />);
    expect(
      screen.getByTestId("blind-select-row-skip-reward-2"),
    ).toHaveTextContent("Investment Tag");
  });

  test("skipping the Small Blind grants its offered tag", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(screen.getByTestId("blind-select-tag-0")).toHaveTextContent(
      "Investment Tag",
    );
  });
});

function rngForTag(id: TagId): () => number {
  const ids = createTagCatalog().map((t) => t.id);
  const index = ids.indexOf(id);
  return () => (index + 0.5) / ids.length;
}

function rngSequenceForTags(sequence: ReadonlyArray<TagId>): () => number {
  const ids = createTagCatalog().map((t) => t.id);
  const fractions = sequence.map((id) => (ids.indexOf(id) + 0.5) / ids.length);
  let call = 0;
  return () => fractions[Math.min(call++, fractions.length - 1)];
}

describe("D6 tag next-shop queue", () => {
  test("gaining the D6 tag on skip makes the next shop's first reroll free", async () => {
    tagOfferRngConfig.rng = rngForTag("d6");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    await user.click(screen.getByTestId("blind-select-play"));
    await user.click(screen.getByText(/^🏆 Win$/));
    expect(screen.getByRole("button", { name: /Reroll shop offers/ })).toHaveTextContent(
      "Reroll ($0)",
    );
  });

  test("without a next-shop tag the next shop's first reroll costs the base $5 (negative)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/^🏆 Win$/));
    expect(screen.getByRole("button", { name: /Reroll shop offers/ })).toHaveTextContent(
      "Reroll ($5)",
    );
  });
});

describe("Run-stat money tags", () => {
  test("skipping with the Speed tag grants $5 for the first blind skipped", async () => {
    tagOfferRngConfig.rng = rngForTag("speed");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(getStatValue("Money")).toHaveTextContent("$9");
  });

  test("the Speed tag pays out per blind skipped, including the current skip", async () => {
    tagOfferRngConfig.rng = rngForTag("speed");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(getStatValue("Money")).toHaveTextContent("$19");
  });

  test("an immediate tag is not retained as a held tag (negative)", async () => {
    tagOfferRngConfig.rng = rngForTag("speed");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(screen.queryByTestId("blind-select-tag-0")).not.toBeInTheDocument();
  });
});

describe("Economy tag", () => {
  test("skipping with the Economy tag doubles the player's money", async () => {
    tagOfferRngConfig.rng = rngForTag("economy");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(getStatValue("Money")).toHaveTextContent("$8");
  });
});

describe("Charm and Ethereal pack tags", () => {
  test("gaining the Charm tag immediately opens a Mega Arcana pack", async () => {
    tagOfferRngConfig.rng = rngForTag("charm");
    shopPickerRngConfig.rng = () => 0;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(
      screen.getByRole("heading", { name: /Mega Arcana Pack/ }),
    ).toBeInTheDocument();
  });

  test("gaining the Ethereal tag immediately opens a Spectral pack", async () => {
    tagOfferRngConfig.rng = rngForTag("ethereal");
    shopPickerRngConfig.rng = () => 0;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(
      screen.getByRole("heading", { name: /Spectral Pack/ }),
    ).toBeInTheDocument();
  });

  test("a target-needing spectral picked from the Ethereal pack is stashed as a consumable", async () => {
    tagOfferRngConfig.rng = rngForTag("ethereal");
    const spectrals = createSpectralCatalog();
    const talismanIdx = spectrals.findIndex((s) => s.id === "talisman");
    shopPickerRngConfig.rng = () => talismanIdx / spectrals.length + 1e-9;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    await user.click(screen.getByTestId("pack-open-pick-0"));
    expect(screen.getByTestId("consumable-tile-filled-0")).toBeInTheDocument();
  });

  test("a money tag does not open a pack (negative)", async () => {
    tagOfferRngConfig.rng = rngForTag("economy");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(screen.queryByTestId("pack-open-subtitle")).not.toBeInTheDocument();
  });
});

describe("Standard, Meteor, and Buffoon pack tags", () => {
  test("gaining the Standard tag opens a Mega Standard pack", async () => {
    tagOfferRngConfig.rng = rngForTag("standard");
    shopPickerRngConfig.rng = () => 0;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(
      screen.getByRole("heading", { name: /Mega Standard Pack/ }),
    ).toBeInTheDocument();
  });

  test("gaining the Meteor tag opens a Mega Celestial pack", async () => {
    tagOfferRngConfig.rng = rngForTag("meteor");
    shopPickerRngConfig.rng = () => 0;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(
      screen.getByRole("heading", { name: /Mega Celestial Pack/ }),
    ).toBeInTheDocument();
  });

  test("gaining the Buffoon tag opens a Mega Buffoon pack", async () => {
    tagOfferRngConfig.rng = rngForTag("buffoon");
    shopPickerRngConfig.rng = () => 0;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(
      screen.getByRole("heading", { name: /Mega Buffoon Pack/ }),
    ).toBeInTheDocument();
  });
});

describe("Coupon tag", () => {
  test("gaining Coupon makes the next shop's offers free", async () => {
    tagOfferRngConfig.rng = rngForTag("coupon");
    shopPickerRngConfig.rng = () => 0;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    await user.click(screen.getByTestId("blind-select-play"));
    await user.click(screen.getByText(/^🏆 Win$/));
    expect(
      screen.queryAllByRole("button", { name: /Buy \(\$0\)/ }).length,
    ).toBeGreaterThan(0);
  });

  test("a shop without the Coupon tag has no free offers (negative)", async () => {
    shopPickerRngConfig.rng = () => 0;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/^🏆 Win$/));
    expect(
      screen.queryAllByRole("button", { name: /Buy \(\$0\)/ }).length,
    ).toBe(0);
  });
});

describe("Uncommon and Rare joker tags", () => {
  test("gaining Uncommon adds a free joker offer to the next shop", async () => {
    tagOfferRngConfig.rng = rngForTag("uncommon");
    shopPickerRngConfig.rng = () => 0;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    await user.click(screen.getByTestId("blind-select-play"));
    await user.click(screen.getByText(/^🏆 Win$/));
    expect(
      screen.queryAllByRole("button", { name: /Buy \(\$0\)/ }).length,
    ).toBeGreaterThan(0);
  });

  test("gaining Rare adds a free joker offer to the next shop", async () => {
    tagOfferRngConfig.rng = rngForTag("rare");
    shopPickerRngConfig.rng = () => 0;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    await user.click(screen.getByTestId("blind-select-play"));
    await user.click(screen.getByText(/^🏆 Win$/));
    expect(
      screen.queryAllByRole("button", { name: /Buy \(\$0\)/ }).length,
    ).toBeGreaterThan(0);
  });
});

describe("Voucher tag", () => {
  test("gaining Voucher adds a second voucher to the next shop", async () => {
    tagOfferRngConfig.rng = rngForTag("voucher");
    shopPickerRngConfig.rng = () => 0;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    await user.click(screen.getByTestId("blind-select-play"));
    await user.click(screen.getByText(/^🏆 Win$/));
    expect(screen.getByTestId("shop-voucher-1")).toBeInTheDocument();
  });

  test("a shop without the Voucher tag offers only one voucher (negative)", async () => {
    shopPickerRngConfig.rng = () => 0;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/^🏆 Win$/));
    expect(screen.queryByTestId("shop-voucher-1")).not.toBeInTheDocument();
  });
});

describe("Top-up tag", () => {
  const jokerCount = () => screen.queryAllByTestId(/^joker-tile-filled-/).length;

  test("gaining Top-up creates two Common Jokers", async () => {
    tagOfferRngConfig.rng = rngForTag("top-up");
    shopPickerRngConfig.rng = () => 0;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const before = jokerCount();
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(jokerCount() - before).toBe(2);
  });

  test("a non-Top-up tag creates no jokers (negative)", async () => {
    tagOfferRngConfig.rng = rngForTag("economy");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const before = jokerCount();
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(jokerCount() - before).toBe(0);
  });
});

describe("Boss tag", () => {
  const bossText = () =>
    screen.getByTestId("blind-select-boss-description").textContent;

  test("gaining the Boss tag rerolls the boss blind", async () => {
    tagOfferRngConfig.rng = rngForTag("boss");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const before = bossText();
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(bossText()).not.toBe(before);
  });

  test("a non-Boss tag leaves the boss blind unchanged (negative)", async () => {
    tagOfferRngConfig.rng = rngForTag("economy");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    const before = bossText();
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(bossText()).toBe(before);
  });
});

describe("Orbital tag", () => {
  test("gaining Orbital upgrades a poker hand by 3 levels", async () => {
    tagOfferRngConfig.rng = rngForTag("orbital");
    shopPickerRngConfig.rng = () => 0;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    await user.click(screen.getByRole("button", { name: "Run info" }));
    expect(screen.getByTestId("run-info-level-High Card")).toHaveTextContent("4");
  });

  test("a non-Orbital tag leaves hand levels unchanged (negative)", async () => {
    tagOfferRngConfig.rng = rngForTag("economy");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    await user.click(screen.getByRole("button", { name: "Run info" }));
    expect(screen.getByTestId("run-info-level-High Card")).toHaveTextContent("1");
  });
});

describe("Juggle tag", () => {
  test("gaining Juggle deals 3 extra cards in the next round", async () => {
    tagOfferRngConfig.rng = rngForTag("juggle");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    await user.click(screen.getByTestId("blind-select-play"));
    expect(getHandCardButtons()).toHaveLength(11);
  });

  test("a non-Juggle tag deals the normal hand size (negative)", async () => {
    tagOfferRngConfig.rng = rngForTag("economy");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    await user.click(screen.getByTestId("blind-select-play"));
    expect(getHandCardButtons()).toHaveLength(8);
  });
});

describe("Edition tags", () => {
  test("gaining Foil makes the next shop's joker free and Foil when bought", async () => {
    tagOfferRngConfig.rng = rngForTag("foil");
    shopPickerRngConfig.rng = forceShopLayout(["joker", "planet"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    await user.click(screen.getByTestId("blind-select-play"));
    await user.click(screen.getByText(/^🏆 Win$/));
    await user.click(screen.getByRole("button", { name: /Buy \(\$0\)/ }));
    expect(document.querySelector('[data-edition="foil"]')).not.toBeNull();
  });

  test("a shop without an edition tag has no free joker offer (negative)", async () => {
    shopPickerRngConfig.rng = forceShopLayout(["joker", "planet"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/^🏆 Win$/));
    expect(
      screen.queryAllByRole("button", { name: /Buy \(\$0\)/ }).length,
    ).toBe(0);
  });
});

describe("Double tag", () => {
  test("Double then Speed pays the Speed money twice", async () => {
    tagOfferRngConfig.rng = rngSequenceForTags(["double", "speed"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(getStatValue("Money")).toHaveTextContent("$24");
  });

  test("without Double, Speed pays once (negative)", async () => {
    tagOfferRngConfig.rng = rngSequenceForTags(["investment", "speed"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(getStatValue("Money")).toHaveTextContent("$14");
  });

  test("a second Double is not itself duplicated (negative)", async () => {
    tagOfferRngConfig.rng = rngForTag("double");
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByTestId("blind-select-skip"));
    await user.click(screen.getByTestId("blind-select-skip"));
    expect(document.querySelectorAll('[data-tag-id="double"]')).toHaveLength(2);
  });
});

describe("Ectoplasm spectral", () => {
  test("picking Ectoplasm from a Spectral pack adds Negative to a joker", async () => {
    const originalFactory = initialJokersConfig.factory;
    initialJokersConfig.factory = () => [createGreedyJoker()];
    tagOfferRngConfig.rng = rngForTag("ethereal");
    const spectrals = createSpectralCatalog();
    const ectoplasmIdx = spectrals.findIndex((s) => s.id === "ectoplasm");
    shopPickerRngConfig.rng = () => ectoplasmIdx / spectrals.length + 1e-9;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    initialJokersConfig.factory = originalFactory;
    await user.click(screen.getByTestId("blind-select-skip"));
    await user.click(screen.getByTestId("pack-open-pick-0"));
    expect(document.querySelector('[data-edition="negative"]')).not.toBeNull();
  });
});
