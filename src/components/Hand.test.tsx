import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Hand from "./Hand";
import type { Card as CardType } from "../types";
import { createDeck } from "../deck";

function getHandRegion(): HTMLElement {
  return screen.getByLabelText("Your hand");
}

function getCardButtons(): HTMLElement[] {
  return within(getHandRegion()).getAllByRole("button");
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

  test("calls onToggleCard with the card when a card is clicked", () => {
    const deck = createDeck();
    const handCards = deck.slice(0, 8);
    const onToggleCard = jest.fn();
    renderHand({ hand: handCards, onToggleCard });
    const target = handCards[0];
    const targetLabel = `${target.rank} of ${
      target.suit.charAt(0).toUpperCase() + target.suit.slice(1)
    }`;
    userEvent.click(screen.getByRole("button", { name: targetLabel }));
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

  test("clicking Suit re-orders cards by suit", () => {
    renderHand({ hand: shuffledHand, remaining: [] });
    userEvent.click(screen.getByRole("button", { name: "Suit" }));
    const labels = getCardButtons().map((btn) => btn.getAttribute("aria-label"));
    expect(labels).toEqual([
      "10 of Clubs",
      "A of Diamonds",
      "K of Hearts",
      "2 of Spades",
    ]);
  });

  test("clicking Suit marks the Suit button as pressed", () => {
    renderHand({ hand: shuffledHand, remaining: [] });
    userEvent.click(screen.getByRole("button", { name: "Suit" }));
    expect(screen.getByRole("button", { name: "Suit" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("clicking Suit unsets the Rank button", () => {
    renderHand({ hand: shuffledHand, remaining: [] });
    userEvent.click(screen.getByRole("button", { name: "Suit" }));
    expect(screen.getByRole("button", { name: "Rank" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  test("clicking Rank after Suit restores rank-descending ordering", () => {
    renderHand({ hand: shuffledHand, remaining: [] });
    userEvent.click(screen.getByRole("button", { name: "Suit" }));
    userEvent.click(screen.getByRole("button", { name: "Rank" }));
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
