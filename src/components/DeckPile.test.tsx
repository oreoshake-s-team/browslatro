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

  test("clicking the pile opens the modal", async () => {
    const user = userEvent.setup();
    render(<DeckPile remaining={createDeck()} />);
    await user.click(screen.getByRole("button", { name: /Deck/ }));
    expect(
      screen.getByRole("heading", { name: "Remaining Cards" })
    ).toBeInTheDocument();
  });

  test("modal lists every suit heading", async () => {
    const user = userEvent.setup();
    render(<DeckPile remaining={createDeck()} />);
    await user.click(screen.getByRole("button", { name: /Deck/ }));
    const suitHeadings = ["Spades", "Hearts", "Diamonds", "Clubs"].filter(
      (suit) => screen.queryByRole("heading", { name: new RegExp(suit) })
    );
    expect(suitHeadings).toHaveLength(4);
  });

  test("modal shows the per-suit count for a full deck", async () => {
    const user = userEvent.setup();
    render(<DeckPile remaining={createDeck()} />);
    await user.click(screen.getByRole("button", { name: /Deck/ }));
    expect(
      screen.getByRole("heading", { name: "Hearts (13)" })
    ).toBeInTheDocument();
  });

  test("modal shows zero for missing suits", async () => {
    const user = userEvent.setup();
    const onlySpades = createDeck().filter((c) => c.suit === "spades");
    render(<DeckPile remaining={onlySpades} />);
    await user.click(screen.getByRole("button", { name: /Deck/ }));
    expect(
      screen.getByRole("heading", { name: "Clubs (0)" })
    ).toBeInTheDocument();
  });

  test("modal renders one card button per remaining card", async () => {
    const user = userEvent.setup();
    const deck = createDeck();
    render(<DeckPile remaining={deck} />);
    await user.click(screen.getByRole("button", { name: /Deck/ }));
    const modal = screen.getByRole("heading", { name: "Remaining Cards" })
      .parentElement as HTMLElement;
    const cardButtons = within(modal).getAllByRole("button").filter(
      (btn) => btn.classList.contains("card")
    );
    expect(cardButtons).toHaveLength(deck.length);
  });

  test("Close button dismisses the modal", async () => {
    const user = userEvent.setup();
    render(<DeckPile remaining={createDeck()} />);
    await user.click(screen.getByRole("button", { name: /Deck/ }));
    await user.click(screen.getByText("Close"));
    expect(
      screen.queryByRole("heading", { name: "Remaining Cards" })
    ).not.toBeInTheDocument();
  });

  test("clicking the overlay dismisses the modal", async () => {
    const user = userEvent.setup();
    render(<DeckPile remaining={createDeck()} />);
    await user.click(screen.getByRole("button", { name: /Deck/ }));
    await user.click(document.querySelector(".modal-overlay") as HTMLElement);
    expect(
      screen.queryByRole("heading", { name: "Remaining Cards" })
    ).not.toBeInTheDocument();
  });
});
