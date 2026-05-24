import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DiscardPile from "./DiscardPile";
import type { Card as CardType } from "../types";
import { createDeck } from "../deck";

const sampleCards: CardType[] = [
  { id: 1, rank: "A", suit: "spades" },
  { id: 2, rank: "K", suit: "hearts" },
  { id: 3, rank: "Q", suit: "diamonds" },
];

describe("DiscardPile", () => {
  test("shows zero count when no cards have been discarded", () => {
    render(<DiscardPile discarded={[]} />);
    expect(
      screen.getByRole("button", { name: /Discard pile \(0 cards\)/ })
    ).toBeInTheDocument();
  });

  test("displays an empty 'Discard' label when no cards are discarded", () => {
    render(<DiscardPile discarded={[]} />);
    expect(screen.getByText("Discard")).toBeInTheDocument();
  });

  test("reflects the discarded card count on the pile", () => {
    render(<DiscardPile discarded={sampleCards} />);
    expect(
      screen.getByRole("button", { name: /Discard pile \(3 cards\)/ })
    ).toBeInTheDocument();
  });

  test("renders the top discarded card face-up on the pile", () => {
    render(<DiscardPile discarded={sampleCards} />);
    expect(
      within(screen.getByLabelText(/Discard pile/)).getByRole("button", {
        name: "Q of Diamonds",
      })
    ).toBeInTheDocument();
  });

  test("modal is hidden by default", () => {
    render(<DiscardPile discarded={sampleCards} />);
    expect(
      screen.queryByRole("heading", { name: "Discarded Cards" })
    ).not.toBeInTheDocument();
  });

  test("clicking the pile opens the modal", () => {
    render(<DiscardPile discarded={sampleCards} />);
    userEvent.click(screen.getByLabelText(/Discard pile/));
    expect(
      screen.getByRole("heading", { name: "Discarded Cards" })
    ).toBeInTheDocument();
  });

  test("modal shows per-suit counts", () => {
    const fullDeckDiscarded = createDeck();
    render(<DiscardPile discarded={fullDeckDiscarded} />);
    userEvent.click(screen.getByLabelText(/Discard pile/));
    expect(
      screen.getByRole("heading", { name: "Hearts (13)" })
    ).toBeInTheDocument();
  });

  test("Close button dismisses the modal", () => {
    render(<DiscardPile discarded={sampleCards} />);
    userEvent.click(screen.getByLabelText(/Discard pile/));
    userEvent.click(screen.getByText("Close"));
    expect(
      screen.queryByRole("heading", { name: "Discarded Cards" })
    ).not.toBeInTheDocument();
  });
});
