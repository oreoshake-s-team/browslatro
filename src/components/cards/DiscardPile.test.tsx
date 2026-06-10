import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DiscardPile from "./DiscardPile";
import type { Card as CardType } from "../../cards/types";
import { createDeck } from "../../cards/deck";

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
      screen
        .getByRole("button", { name: /Discard pile/ })
        .querySelector(".card-suit-diamonds")
    ).not.toBeNull();
  });

  test("the pile trigger is a native button element", () => {
    render(<DiscardPile discarded={sampleCards} />);
    expect(screen.getByRole("button", { name: /Discard pile/ }).tagName).toBe(
      "BUTTON"
    );
  });

  test("the top card is decorative, not a nested interactive element", () => {
    render(<DiscardPile discarded={sampleCards} />);
    expect(
      within(screen.getByRole("button", { name: /Discard pile/ })).queryByRole(
        "button"
      )
    ).not.toBeInTheDocument();
  });

  test("modal is hidden by default", () => {
    render(<DiscardPile discarded={sampleCards} />);
    expect(
      screen.queryByRole("heading", { name: "Discarded Cards" })
    ).not.toBeInTheDocument();
  });

  test("clicking the pile opens the modal", async () => {
    const user = userEvent.setup();
    render(<DiscardPile discarded={sampleCards} />);
    await user.click(screen.getByLabelText(/Discard pile/));
    expect(
      screen.getByRole("heading", { name: "Discarded Cards" })
    ).toBeInTheDocument();
  });

  test("modal shows per-suit counts", async () => {
    const user = userEvent.setup();
    const fullDeckDiscarded = createDeck();
    render(<DiscardPile discarded={fullDeckDiscarded} />);
    await user.click(screen.getByLabelText(/Discard pile/));
    expect(
      screen.getByRole("heading", { name: "Hearts (13)" })
    ).toBeInTheDocument();
  });

  test("Close button dismisses the modal", async () => {
    const user = userEvent.setup();
    render(<DiscardPile discarded={sampleCards} />);
    await user.click(screen.getByLabelText(/Discard pile/));
    await user.click(screen.getByText("Close"));
    expect(
      screen.queryByRole("heading", { name: "Discarded Cards" })
    ).not.toBeInTheDocument();
  });

  test("Escape closes the modal when open", async () => {
    const user = userEvent.setup();
    render(<DiscardPile discarded={sampleCards} />);
    await user.click(screen.getByLabelText(/Discard pile/));
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("heading", { name: "Discarded Cards" })
    ).not.toBeInTheDocument();
  });

  test("Escape while modal is closed is a no-op", async () => {
    const user = userEvent.setup();
    render(<DiscardPile discarded={sampleCards} />);
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("heading", { name: "Discarded Cards" })
    ).not.toBeInTheDocument();
  });

  test("Enter while modal is open does not close it", async () => {
    const user = userEvent.setup();
    render(<DiscardPile discarded={sampleCards} />);
    await user.click(screen.getByLabelText(/Discard pile/));
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("heading", { name: "Discarded Cards" })
    ).toBeInTheDocument();
  });
});

describe("DiscardPile dialog semantics (#912)", () => {
  test("open modal exposes dialog semantics labelled by its title", async () => {
    const user = userEvent.setup();
    render(<DiscardPile discarded={sampleCards} />);
    await user.click(screen.getByLabelText(/Discard pile/));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Discarded Cards");
  });

  test("moves focus into the dialog on open and restores it to the trigger on close", async () => {
    const user = userEvent.setup();
    render(<DiscardPile discarded={sampleCards} />);
    const trigger = screen.getByRole("button", { name: /Discard pile/ });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
