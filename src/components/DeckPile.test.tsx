import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeckPile from "./DeckPile";
import { createDeck } from "../deck";

describe("DeckPile", () => {
  test("renders the remaining card count on the pile", () => {
    render(<DeckPile remaining={createDeck()} />);
    expect(
      screen.getByRole("button", { name: /Deck \(52 cards remaining\)/ })
    ).toBeInTheDocument();
  });

  test("modal is hidden by default", () => {
    render(<DeckPile remaining={createDeck()} />);
    expect(
      screen.queryByRole("heading", { name: "Remaining Cards" })
    ).not.toBeInTheDocument();
  });

  test("clicking the pile opens the modal", () => {
    render(<DeckPile remaining={createDeck()} />);
    userEvent.click(screen.getByRole("button", { name: /Deck/ }));
    expect(
      screen.getByRole("heading", { name: "Remaining Cards" })
    ).toBeInTheDocument();
  });

  test("modal lists every suit heading", () => {
    render(<DeckPile remaining={createDeck()} />);
    userEvent.click(screen.getByRole("button", { name: /Deck/ }));
    const suitHeadings = ["Spades", "Hearts", "Diamonds", "Clubs"].filter(
      (suit) => screen.queryByRole("heading", { name: new RegExp(suit) })
    );
    expect(suitHeadings).toHaveLength(4);
  });

  test("modal shows the per-suit count for a full deck", () => {
    render(<DeckPile remaining={createDeck()} />);
    userEvent.click(screen.getByRole("button", { name: /Deck/ }));
    expect(
      screen.getByRole("heading", { name: "Hearts (13)" })
    ).toBeInTheDocument();
  });

  test("modal shows zero for missing suits", () => {
    const onlySpades = createDeck().filter((c) => c.suit === "spades");
    render(<DeckPile remaining={onlySpades} />);
    userEvent.click(screen.getByRole("button", { name: /Deck/ }));
    expect(
      screen.getByRole("heading", { name: "Clubs (0)" })
    ).toBeInTheDocument();
  });

  test("modal renders one card button per remaining card", () => {
    const deck = createDeck();
    render(<DeckPile remaining={deck} />);
    userEvent.click(screen.getByRole("button", { name: /Deck/ }));
    const modal = screen.getByRole("heading", { name: "Remaining Cards" })
      .parentElement as HTMLElement;
    const cardButtons = within(modal).getAllByRole("button").filter(
      (btn) => btn.classList.contains("card")
    );
    expect(cardButtons).toHaveLength(deck.length);
  });

  test("Close button dismisses the modal", () => {
    render(<DeckPile remaining={createDeck()} />);
    userEvent.click(screen.getByRole("button", { name: /Deck/ }));
    userEvent.click(screen.getByText("Close"));
    expect(
      screen.queryByRole("heading", { name: "Remaining Cards" })
    ).not.toBeInTheDocument();
  });

  test("clicking the overlay dismisses the modal", () => {
    render(<DeckPile remaining={createDeck()} />);
    userEvent.click(screen.getByRole("button", { name: /Deck/ }));
    userEvent.click(document.querySelector(".modal-overlay") as HTMLElement);
    expect(
      screen.queryByRole("heading", { name: "Remaining Cards" })
    ).not.toBeInTheDocument();
  });
});
