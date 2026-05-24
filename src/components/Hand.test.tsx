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

describe("Hand", () => {
  test("renders 8 card buttons by default", () => {
    render(<Hand initialDeck={createDeck()} />);
    expect(getCardButtons()).toHaveLength(8);
  });

  test("uses the first 8 cards from the provided deck", () => {
    const deck = createDeck();
    render(<Hand initialDeck={deck} />);
    const firstCardLabel = `${deck[0].rank} of ${
      deck[0].suit.charAt(0).toUpperCase() + deck[0].suit.slice(1)
    }`;
    expect(screen.getByRole("button", { name: firstCardLabel })).toBeInTheDocument();
  });

  test("all cards start unselected", () => {
    render(<Hand initialDeck={createDeck()} />);
    const allUnpressed = getCardButtons().every(
      (btn) => btn.getAttribute("aria-pressed") === "false"
    );
    expect(allUnpressed).toBe(true);
  });

  test("clicking a card selects it", () => {
    render(<Hand initialDeck={createDeck()} />);
    const card = getCardButtons()[0];
    userEvent.click(card);
    expect(card).toHaveAttribute("aria-pressed", "true");
  });

  test("clicking a selected card deselects it", () => {
    render(<Hand initialDeck={createDeck()} />);
    const card = getCardButtons()[0];
    userEvent.click(card);
    userEvent.click(card);
    expect(card).toHaveAttribute("aria-pressed", "false");
  });

  test("supports selecting multiple cards independently", () => {
    render(<Hand initialDeck={createDeck()} />);
    const cards = getCardButtons();
    userEvent.click(cards[0]);
    userEvent.click(cards[3]);
    const selectedCount = getCardButtons().filter(
      (btn) => btn.getAttribute("aria-pressed") === "true"
    ).length;
    expect(selectedCount).toBe(2);
  });

  test("selecting one card does not select its neighbor", () => {
    render(<Hand initialDeck={createDeck()} />);
    const cards = getCardButtons();
    userEvent.click(cards[0]);
    expect(cards[1]).toHaveAttribute("aria-pressed", "false");
  });

  test("respects a shorter custom deck for testing", () => {
    const tinyDeck: CardType[] = [
      { id: 100, rank: "A", suit: "spades" },
      { id: 101, rank: "K", suit: "hearts" },
    ];
    render(<Hand initialDeck={tinyDeck} />);
    expect(getCardButtons()).toHaveLength(2);
  });

  test("renders a deck pile showing the remaining card count", () => {
    render(<Hand initialDeck={createDeck()} />);
    expect(
      screen.getByRole("button", { name: /Deck \(44 cards remaining\)/ })
    ).toBeInTheDocument();
  });
});
