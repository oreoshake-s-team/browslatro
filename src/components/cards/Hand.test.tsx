import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Hand from "./Hand";
import type { Card as CardType } from "../../types";
import { createDeck } from "../../deck";

function getHandRegion(): HTMLElement {
  return screen.getByLabelText("Your hand");
}

function getCardButtons(): HTMLElement[] {
  // Card buttons expose aria-pressed; reorder controls in the slot do not.
  return within(getHandRegion())
    .getAllByRole("button")
    .filter((btn) => btn.hasAttribute("aria-pressed"));
}

function renderHand(overrides: Partial<React.ComponentProps<typeof Hand>> = {}) {
  const deck = createDeck();
  return render(
    <Hand
      hand={deck.slice(0, 8)}
      remaining={deck.slice(8)}
      selectedIds={new Set()}
      discardingIds={new Set()}
      onToggleCard={jest.fn()}
      onCardDiscardEnd={jest.fn()}
      {...overrides}
    />
  );
}

describe("Hand", () => {
  test("renders one card button per card in the hand prop", () => {
    renderHand();
    expect(getCardButtons()).toHaveLength(8);
  });

  test("renders the cards passed via the hand prop", () => {
    const deck = createDeck();
    renderHand({ hand: deck.slice(0, 8) });
    const firstCardLabel = `${deck[0].rank} of ${
      deck[0].suit.charAt(0).toUpperCase() + deck[0].suit.slice(1)
    }`;
    expect(
      screen.getByRole("button", { name: firstCardLabel })
    ).toBeInTheDocument();
  });

  test("renders any cards in selectedIds as pressed", () => {
    const deck = createDeck();
    renderHand({
      hand: deck.slice(0, 8),
      selectedIds: new Set([deck[0].id, deck[2].id]),
    });
    const pressedCount = getCardButtons().filter(
      (btn) => btn.getAttribute("aria-pressed") === "true"
    ).length;
    expect(pressedCount).toBe(2);
  });

  test("calls onToggleCard with the card when a card is clicked", async () => {
    const user = userEvent.setup();
    const deck = createDeck();
    const handCards = deck.slice(0, 8);
    const onToggleCard = jest.fn();
    renderHand({ hand: handCards, onToggleCard });
    const target = handCards[0];
    const targetLabel = `${target.rank} of ${
      target.suit.charAt(0).toUpperCase() + target.suit.slice(1)
    }`;
    await user.click(screen.getByRole("button", { name: targetLabel }));
    expect(onToggleCard).toHaveBeenCalledWith(target);
  });

  test("renders a deck pile reflecting the remaining card count", () => {
    const deck = createDeck();
    renderHand({ hand: deck.slice(0, 8), remaining: deck.slice(8) });
    expect(
      screen.getByRole("button", { name: /Deck \(44 cards remaining\)/ })
    ).toBeInTheDocument();
  });

  test("renders smaller hands without padding to a fixed size", () => {
    const tinyHand: CardType[] = [
      { id: 100, rank: "A", suit: "spades" },
      { id: 101, rank: "K", suit: "hearts" },
    ];
    renderHand({ hand: tinyHand, remaining: [] });
    expect(getCardButtons()).toHaveLength(2);
  });
});

describe("Hand sorting", () => {
  const shuffledHand: CardType[] = [
    { id: 1, rank: "K", suit: "hearts" },
    { id: 2, rank: "2", suit: "spades" },
    { id: 3, rank: "10", suit: "clubs" },
    { id: 4, rank: "A", suit: "diamonds" },
  ];

  test("defaults to rank-descending order (A → 2)", () => {
    renderHand({ hand: shuffledHand, remaining: [] });
    const labels = getCardButtons().map((btn) => btn.getAttribute("aria-label"));
    expect(labels).toEqual([
      "A of Diamonds",
      "K of Hearts",
      "10 of Clubs",
      "2 of Spades",
    ]);
  });

  test("Rank sort button is pressed by default", () => {
    renderHand({ hand: shuffledHand, remaining: [] });
    expect(screen.getByRole("button", { name: "Rank" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("clicking Suit re-orders cards by suit", async () => {
    const user = userEvent.setup();
    renderHand({ hand: shuffledHand, remaining: [] });
    await user.click(screen.getByRole("button", { name: "Suit" }));
    const labels = getCardButtons().map((btn) => btn.getAttribute("aria-label"));
    expect(labels).toEqual([
      "10 of Clubs",
      "A of Diamonds",
      "2 of Spades",
      "K of Hearts",
    ]);
  });

  test("clicking Suit marks the Suit button as pressed", async () => {
    const user = userEvent.setup();
    renderHand({ hand: shuffledHand, remaining: [] });
    await user.click(screen.getByRole("button", { name: "Suit" }));
    expect(screen.getByRole("button", { name: "Suit" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("clicking Suit unsets the Rank button", async () => {
    const user = userEvent.setup();
    renderHand({ hand: shuffledHand, remaining: [] });
    await user.click(screen.getByRole("button", { name: "Suit" }));
    expect(screen.getByRole("button", { name: "Rank" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("clicking Rank after Suit restores rank-descending ordering", async () => {
    const user = userEvent.setup();
    renderHand({ hand: shuffledHand, remaining: [] });
    await user.click(screen.getByRole("button", { name: "Suit" }));
    await user.click(screen.getByRole("button", { name: "Rank" }));
    const labels = getCardButtons().map((btn) => btn.getAttribute("aria-label"));
    expect(labels).toEqual([
      "A of Diamonds",
      "K of Hearts",
      "10 of Clubs",
      "2 of Spades",
    ]);
  });

  test("re-sorts the displayed hand when the hand prop changes", () => {
    const initial: CardType[] = [
      { id: 1, rank: "5", suit: "hearts" },
      { id: 2, rank: "J", suit: "clubs" },
    ];
    const updated: CardType[] = [
      { id: 1, rank: "5", suit: "hearts" },
      { id: 3, rank: "Q", suit: "diamonds" },
    ];
    const { rerender } = renderHand({ hand: initial, remaining: [] });
    rerender(
      <Hand
        hand={updated}
        remaining={[]}
        selectedIds={new Set()}
        discardingIds={new Set()}
        onToggleCard={jest.fn()}
        onCardDiscardEnd={jest.fn()}
      />,
    );
    const labels = getCardButtons().map((btn) => btn.getAttribute("aria-label"));
    expect(labels).toEqual(["Q of Diamonds", "5 of Hearts"]);
  });
});

describe("Hand manual reordering", () => {
  const fourCards: CardType[] = [
    { id: 1, rank: "K", suit: "hearts" },
    { id: 2, rank: "2", suit: "spades" },
    { id: 3, rank: "10", suit: "clubs" },
    { id: 4, rank: "A", suit: "diamonds" },
  ];

  test("renders a Move left button for every card", () => {
    renderHand({ hand: fourCards, remaining: [] });
    expect(screen.getAllByRole("button", { name: /^Move .* left$/ })).toHaveLength(
      4,
    );
  });

  test("renders a Move right button for every card", () => {
    renderHand({ hand: fourCards, remaining: [] });
    expect(
      screen.getAllByRole("button", { name: /^Move .* right$/ }),
    ).toHaveLength(4);
  });

  test("disables Move left on the leftmost card", () => {
    renderHand({ hand: fourCards, remaining: [] });
    // Default rank-sort puts A of Diamonds first
    expect(
      screen.getByRole("button", { name: "Move A of Diamonds left" }),
    ).toBeDisabled();
  });

  test("disables Move right on the rightmost card", () => {
    renderHand({ hand: fourCards, remaining: [] });
    // Default rank-sort puts 2 of Spades last
    expect(
      screen.getByRole("button", { name: "Move 2 of Spades right" }),
    ).toBeDisabled();
  });

  test("clicking Move right moves the card one position to the right", async () => {
    const user = userEvent.setup();
    renderHand({ hand: fourCards, remaining: [] });
    // Default order: A♦, K♥, 10♣, 2♠ → move K♥ right → A♦, 10♣, K♥, 2♠
    await user.click(screen.getByRole("button", { name: "Move K of Hearts right" }));
    const labels = getCardButtons().map((btn) => btn.getAttribute("aria-label"));
    expect(labels).toEqual([
      "A of Diamonds",
      "10 of Clubs",
      "K of Hearts",
      "2 of Spades",
    ]);
  });

  test("clicking Move left moves the card one position to the left", async () => {
    const user = userEvent.setup();
    renderHand({ hand: fourCards, remaining: [] });
    await user.click(screen.getByRole("button", { name: "Move 10 of Clubs left" }));
    const labels = getCardButtons().map((btn) => btn.getAttribute("aria-label"));
    expect(labels).toEqual([
      "A of Diamonds",
      "10 of Clubs",
      "K of Hearts",
      "2 of Spades",
    ]);
  });

  test("moving a card activates the Manual sort indicator", async () => {
    const user = userEvent.setup();
    renderHand({ hand: fourCards, remaining: [] });
    await user.click(screen.getByRole("button", { name: "Move K of Hearts right" }));
    expect(screen.getByRole("button", { name: "Manual order" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("moving a card unsets the Rank sort indicator", async () => {
    const user = userEvent.setup();
    renderHand({ hand: fourCards, remaining: [] });
    await user.click(screen.getByRole("button", { name: "Move K of Hearts right" }));
    expect(screen.getByRole("button", { name: "Rank" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("clicking Rank after a manual move restores rank-sorted order", async () => {
    const user = userEvent.setup();
    renderHand({ hand: fourCards, remaining: [] });
    await user.click(screen.getByRole("button", { name: "Move K of Hearts right" }));
    await user.click(screen.getByRole("button", { name: "Rank" }));
    const labels = getCardButtons().map((btn) => btn.getAttribute("aria-label"));
    expect(labels).toEqual([
      "A of Diamonds",
      "K of Hearts",
      "10 of Clubs",
      "2 of Spades",
    ]);
  });

  test("a newly drawn card is appended to the manual order", async () => {
    const user = userEvent.setup();
    const { rerender } = renderHand({ hand: fourCards, remaining: [] });
    await user.click(screen.getByRole("button", { name: "Move K of Hearts right" }));
    const withNewCard: CardType[] = [
      ...fourCards,
      { id: 5, rank: "7", suit: "hearts" },
    ];
    rerender(
      <Hand
        hand={withNewCard}
        remaining={[]}
        selectedIds={new Set()}
        discardingIds={new Set()}
        onToggleCard={jest.fn()}
        onCardDiscardEnd={jest.fn()}
      />,
    );
    const labels = getCardButtons().map((btn) => btn.getAttribute("aria-label"));
    expect(labels).toEqual([
      "A of Diamonds",
      "10 of Clubs",
      "K of Hearts",
      "2 of Spades",
      "7 of Hearts",
    ]);
  });

  test("a removed card is dropped from the manual order without disturbing siblings", async () => {
    const user = userEvent.setup();
    const { rerender } = renderHand({ hand: fourCards, remaining: [] });
    await user.click(screen.getByRole("button", { name: "Move K of Hearts right" }));
    const withoutTwo = fourCards.filter((c) => c.id !== 2);
    rerender(
      <Hand
        hand={withoutTwo}
        remaining={[]}
        selectedIds={new Set()}
        discardingIds={new Set()}
        onToggleCard={jest.fn()}
        onCardDiscardEnd={jest.fn()}
      />,
    );
    const labels = getCardButtons().map((btn) => btn.getAttribute("aria-label"));
    expect(labels).toEqual(["A of Diamonds", "10 of Clubs", "K of Hearts"]);
  });
});

describe("Hand drag-and-drop reordering", () => {
  const fourCards: CardType[] = [
    { id: 1, rank: "K", suit: "hearts" },
    { id: 2, rank: "2", suit: "spades" },
    { id: 3, rank: "10", suit: "clubs" },
    { id: 4, rank: "A", suit: "diamonds" },
  ];

  // Default rank-sort displays as: A♦(id 4), K♥(id 1), 10♣(id 3), 2♠(id 2)
  // → displayedHand indices: 0=4, 1=1, 2=3, 3=2
  // → gaps: 0 (before 4), 1 (between 4 and 1), 2 (between 1 and 3),
  //         3 (between 3 and 2), 4 (after 2)

  function getSlot(cardId: number): HTMLElement {
    return screen.getByTestId(`hand-slot-${cardId}`);
  }

  function getGap(gapIdx: number): HTMLElement {
    return screen.getByTestId(`hand-gap-${gapIdx}`);
  }

  function dragCardToGap(sourceId: number, gapIdx: number) {
    const source = getSlot(sourceId);
    const gap = getGap(gapIdx);
    fireEvent.dragStart(source);
    fireEvent.dragOver(gap);
    fireEvent.drop(gap);
    fireEvent.dragEnd(source);
  }

  test("every card slot is draggable", () => {
    renderHand({ hand: fourCards, remaining: [] });
    const slots = fourCards.map((c) => getSlot(c.id));
    expect(slots.every((s) => s.getAttribute("draggable") === "true")).toBe(true);
  });

  test("renders one more gap drop zone than cards in the hand", () => {
    renderHand({ hand: fourCards, remaining: [] });
    const gaps = screen.getAllByTestId(/^hand-gap-/);
    expect(gaps).toHaveLength(fourCards.length + 1);
  });

  test("dropping a card into the leftmost gap moves it to position 0", () => {
    renderHand({ hand: fourCards, remaining: [] });
    // 2♠ starts at index 3; drop into gap 0 → 2♠ becomes first.
    dragCardToGap(2, 0);
    const labels = getCardButtons().map((btn) => btn.getAttribute("aria-label"));
    expect(labels).toEqual([
      "2 of Spades",
      "A of Diamonds",
      "K of Hearts",
      "10 of Clubs",
    ]);
  });

  test("dropping a card into the rightmost gap moves it to the last position", () => {
    renderHand({ hand: fourCards, remaining: [] });
    // A♦ starts at index 0; drop into gap 4 → A♦ becomes last.
    dragCardToGap(4, 4);
    const labels = getCardButtons().map((btn) => btn.getAttribute("aria-label"));
    expect(labels).toEqual([
      "K of Hearts",
      "10 of Clubs",
      "2 of Spades",
      "A of Diamonds",
    ]);
  });

  test("dropping into a middle gap inserts at that position (moving left → right)", () => {
    renderHand({ hand: fourCards, remaining: [] });
    // A♦ at idx 0; drop into gap 3 (between 10♣ and 2♠) → A♦ lands at idx 2.
    dragCardToGap(4, 3);
    const labels = getCardButtons().map((btn) => btn.getAttribute("aria-label"));
    expect(labels).toEqual([
      "K of Hearts",
      "10 of Clubs",
      "A of Diamonds",
      "2 of Spades",
    ]);
  });

  test("dropping into a middle gap inserts at that position (moving right → left)", () => {
    renderHand({ hand: fourCards, remaining: [] });
    // 2♠ at idx 3; drop into gap 1 (between A♦ and K♥) → 2♠ lands at idx 1.
    dragCardToGap(2, 1);
    const labels = getCardButtons().map((btn) => btn.getAttribute("aria-label"));
    expect(labels).toEqual([
      "A of Diamonds",
      "2 of Spades",
      "K of Hearts",
      "10 of Clubs",
    ]);
  });

  test("dropping a card into its own left-adjacent gap is a no-op", () => {
    renderHand({ hand: fourCards, remaining: [] });
    // K♥ is at idx 1; gap 1 is its own left edge → no-op.
    dragCardToGap(1, 1);
    const labels = getCardButtons().map((btn) => btn.getAttribute("aria-label"));
    expect(labels).toEqual([
      "A of Diamonds",
      "K of Hearts",
      "10 of Clubs",
      "2 of Spades",
    ]);
  });

  test("dropping a card into its own right-adjacent gap is a no-op", () => {
    renderHand({ hand: fourCards, remaining: [] });
    // K♥ is at idx 1; gap 2 is its own right edge → no-op.
    dragCardToGap(1, 2);
    const labels = getCardButtons().map((btn) => btn.getAttribute("aria-label"));
    expect(labels).toEqual([
      "A of Diamonds",
      "K of Hearts",
      "10 of Clubs",
      "2 of Spades",
    ]);
  });

  test("dragging activates the Manual sort indicator", () => {
    renderHand({ hand: fourCards, remaining: [] });
    dragCardToGap(4, 3);
    expect(screen.getByRole("button", { name: "Manual order" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("dragging unsets the Rank sort indicator", () => {
    renderHand({ hand: fourCards, remaining: [] });
    dragCardToGap(4, 3);
    expect(screen.getByRole("button", { name: "Rank" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("the dragging slot is marked while a drag is in flight", () => {
    renderHand({ hand: fourCards, remaining: [] });
    const source = getSlot(4);
    fireEvent.dragStart(source);
    expect(source).toHaveClass("hand-card-slot-dragging");
    fireEvent.dragEnd(source);
  });

  test("the hand row widens its drop hitboxes while a drag is in flight", () => {
    renderHand({ hand: fourCards, remaining: [] });
    const handRow = screen.getByLabelText("Your hand");
    expect(handRow).not.toHaveClass("hand-cards-dragging");
    fireEvent.dragStart(getSlot(4));
    expect(handRow).toHaveClass("hand-cards-dragging");
  });

  test("the hand row stops widening its drop hitboxes once the drag ends", () => {
    renderHand({ hand: fourCards, remaining: [] });
    const source = getSlot(4);
    const handRow = screen.getByLabelText("Your hand");
    fireEvent.dragStart(source);
    fireEvent.dragEnd(source);
    expect(handRow).not.toHaveClass("hand-cards-dragging");
  });

  test("the hovered gap is marked active while dragging over it", () => {
    renderHand({ hand: fourCards, remaining: [] });
    const source = getSlot(4);
    const target = getGap(3);
    fireEvent.dragStart(source);
    fireEvent.dragOver(target);
    expect(target).toHaveClass("hand-card-gap-active");
    fireEvent.dragEnd(source);
  });

  test("a non-hovered gap does not get the active class while a different gap is hovered", () => {
    renderHand({ hand: fourCards, remaining: [] });
    const source = getSlot(4);
    fireEvent.dragStart(source);
    fireEvent.dragOver(getGap(3));
    expect(getGap(0)).not.toHaveClass("hand-card-gap-active");
    fireEvent.dragEnd(source);
  });

  test("gap-active highlight is removed after the drop completes", () => {
    renderHand({ hand: fourCards, remaining: [] });
    dragCardToGap(4, 3);
    // Post-drop, no gap should still be highlighted.
    const activeGaps = screen
      .getAllByTestId(/^hand-gap-/)
      .filter((g) => g.classList.contains("hand-card-gap-active"));
    expect(activeGaps).toHaveLength(0);
  });

  test("the source card's own adjacent gaps are not marked active even while a drag is in flight", () => {
    renderHand({ hand: fourCards, remaining: [] });
    // K♥ at idx 1; its self-adjacent gaps are 1 and 2. Hovering gap 1
    // (a no-op target) must NOT trigger the active highlight.
    const source = getSlot(1);
    fireEvent.dragStart(source);
    fireEvent.dragOver(getGap(1));
    expect(getGap(1)).not.toHaveClass("hand-card-gap-active");
    fireEvent.dragEnd(source);
  });

  test("dropping on the hand container commits at the currently-active gap", () => {
    // The container-level drop handler is the fallback when the cursor
    // is released over a card slot or the hand background rather than a
    // gap element directly — so the dragged card still lands at the
    // last-resolved active gap. Hover gap 3 to set it active, then
    // drop on the container.
    renderHand({ hand: fourCards, remaining: [] });
    const source = getSlot(4);
    const handRow = screen.getByLabelText("Your hand");
    fireEvent.dragStart(source);
    fireEvent.dragOver(getGap(3));
    fireEvent.drop(handRow);
    fireEvent.dragEnd(source);
    const labels = getCardButtons().map((btn) => btn.getAttribute("aria-label"));
    expect(labels).toEqual([
      "K of Hearts",
      "10 of Clubs",
      "A of Diamonds",
      "2 of Spades",
    ]);
  });
});
