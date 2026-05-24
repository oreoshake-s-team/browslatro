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
      discarded={[]}
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
    const onToggleCard = jest.fn();
    renderHand({ hand: deck.slice(0, 8), onToggleCard });
    userEvent.click(getCardButtons()[0]);
    expect(onToggleCard).toHaveBeenCalledWith(deck[0]);
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
