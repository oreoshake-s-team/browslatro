import { render, screen, within } from "@testing-library/react";
import DeckSummary from "./DeckSummary";
import { createDeck } from "../../cards/deck";

describe("DeckSummary", () => {
  test("renders the summary region", () => {
    render(<DeckSummary remaining={createDeck()} />);
    expect(screen.getByTestId("deck-summary")).toBeInTheDocument();
  });

  test("shows the per-suit count for a full deck", () => {
    render(<DeckSummary remaining={createDeck()} />);
    const row = screen.getByTestId("deck-summary-suit-spades");
    expect(within(row).getByText("13")).toBeInTheDocument();
  });

  test("shows the per-rank count for a full deck", () => {
    render(<DeckSummary remaining={createDeck()} />);
    const row = screen.getByTestId("deck-summary-rank-A");
    expect(within(row).getByText("4")).toBeInTheDocument();
  });

  test("labels every suit row", () => {
    render(<DeckSummary remaining={createDeck()} />);
    const row = screen.getByTestId("deck-summary-suit-hearts");
    expect(within(row).getByText("Hearts")).toBeInTheDocument();
  });

  test("shows zero for a suit with no remaining cards", () => {
    const onlySpades = createDeck().filter((c) => c.suit === "spades");
    render(<DeckSummary remaining={onlySpades} />);
    const row = screen.getByTestId("deck-summary-suit-clubs");
    expect(within(row).getByText("0")).toBeInTheDocument();
  });

  test("shows zero for a rank with no remaining cards", () => {
    const noAces = createDeck().filter((c) => c.rank !== "A");
    render(<DeckSummary remaining={noAces} />);
    const row = screen.getByTestId("deck-summary-rank-A");
    expect(within(row).getByText("0")).toBeInTheDocument();
  });

  test("excludes a removed card from its suit count", () => {
    const withoutAceSpades = createDeck().filter(
      (c) => !(c.rank === "A" && c.suit === "spades"),
    );
    render(<DeckSummary remaining={withoutAceSpades} />);
    const row = screen.getByTestId("deck-summary-suit-spades");
    expect(within(row).getByText("12")).toBeInTheDocument();
  });

  test("lists ranks in descending order with Ace first", () => {
    render(<DeckSummary remaining={createDeck()} />);
    const firstRankRow = screen.getAllByTestId(/deck-summary-rank-/)[0];
    expect(firstRankRow).toHaveAttribute("data-testid", "deck-summary-rank-A");
  });
});
