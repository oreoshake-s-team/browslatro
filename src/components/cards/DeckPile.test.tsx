import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeckPile from "./DeckPile";
import { createDeck as createGoldDeck } from "../../cards/deck";

function createDeck() {
  return createGoldDeck().map(({ rank, suit, id }) => ({ rank, suit, id }));
}

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

  test("Escape closes the modal when open", async () => {
    const user = userEvent.setup();
    render(<DeckPile remaining={createDeck()} />);
    await user.click(screen.getByRole("button", { name: /Deck/ }));
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("heading", { name: "Remaining Cards" })
    ).not.toBeInTheDocument();
  });

  test("Escape while modal is closed is a no-op", async () => {
    const user = userEvent.setup();
    render(<DeckPile remaining={createDeck()} />);
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("heading", { name: "Remaining Cards" })
    ).not.toBeInTheDocument();
  });

  test("Enter while modal is open does not close it", async () => {
    const user = userEvent.setup();
    render(<DeckPile remaining={createDeck()} />);
    await user.click(screen.getByRole("button", { name: /Deck/ }));
    await user.keyboard("{Enter}");
    expect(
      screen.getByRole("heading", { name: "Remaining Cards" })
    ).toBeInTheDocument();
  });

  test("modal lists each suit's cards in descending rank order", async () => {
    const user = userEvent.setup();
    render(<DeckPile remaining={createDeck()} />);
    await user.click(screen.getByRole("button", { name: /Deck/ }));
    const heartsHeading = screen.getByRole("heading", { name: "Hearts (13)" });
    const section = heartsHeading.parentElement as HTMLElement;
    const ranks = within(section)
      .getAllByRole("button")
      .map((btn) => btn.getAttribute("aria-label"));
    expect(ranks).toEqual([
      "A of Hearts",
      "K of Hearts",
      "Q of Hearts",
      "J of Hearts",
      "10 of Hearts",
      "9 of Hearts",
      "8 of Hearts",
      "7 of Hearts",
      "6 of Hearts",
      "5 of Hearts",
      "4 of Hearts",
      "3 of Hearts",
      "2 of Hearts",
    ]);
  });
});

describe("DeckPile consumable drop zone", () => {
  function dispatchDrag(
    target: Element,
    type: "dragover" | "drop",
    mimes: ReadonlyArray<string>,
  ): boolean {
    let result = false;
    act(() => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, "dataTransfer", {
        value: { types: mimes, dropEffect: "" },
      });
      result = target.dispatchEvent(event);
    });
    return result;
  }

  test("pile invokes onConsumableDrop when a consumable is dropped on it", () => {
    const onConsumableDrop = vi.fn();
    render(
      <DeckPile
        remaining={createDeck()}
        consumableDropEnabled
        onConsumableDrop={onConsumableDrop}
      />,
    );
    const pile = screen.getByRole("button", { name: /Deck/ });
    dispatchDrag(pile, "dragover", ["application/x-browslatro-consumable"]);
    dispatchDrag(pile, "drop", ["application/x-browslatro-consumable"]);
    expect(onConsumableDrop).toHaveBeenCalledTimes(1);
  });

  test("pile ignores a drop that is not a consumable", () => {
    const onConsumableDrop = vi.fn();
    render(
      <DeckPile
        remaining={createDeck()}
        consumableDropEnabled
        onConsumableDrop={onConsumableDrop}
      />,
    );
    const pile = screen.getByRole("button", { name: /Deck/ });
    dispatchDrag(pile, "drop", ["text/plain"]);
    expect(onConsumableDrop).not.toHaveBeenCalled();
  });

  test("pile does not accept a drop when consumableDropEnabled is false", () => {
    const onConsumableDrop = vi.fn();
    render(
      <DeckPile
        remaining={createDeck()}
        consumableDropEnabled={false}
        onConsumableDrop={onConsumableDrop}
      />,
    );
    const pile = screen.getByRole("button", { name: /Deck/ });
    dispatchDrag(pile, "drop", ["application/x-browslatro-consumable"]);
    expect(onConsumableDrop).not.toHaveBeenCalled();
  });

  test("renders a Sell overlay label when consumableDropEnabled is true", () => {
    render(
      <DeckPile
        remaining={createDeck()}
        consumableDropEnabled
        onConsumableDrop={() => {}}
      />,
    );
    expect(
      screen.getByTestId("consumable-drop-overlay-sell"),
    ).toHaveTextContent("Sell");
  });

  test("does not render a Sell overlay when consumableDropEnabled is false", () => {
    render(
      <DeckPile
        remaining={createDeck()}
        consumableDropEnabled={false}
        onConsumableDrop={() => {}}
      />,
    );
    expect(
      screen.queryByTestId("consumable-drop-overlay-sell"),
    ).not.toBeInTheDocument();
  });
});

describe("DeckPile joker drop zone", () => {
  function dispatchDrag(
    target: Element,
    type: "dragover" | "drop",
    mimes: ReadonlyArray<string>,
  ): boolean {
    let result = false;
    act(() => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, "dataTransfer", {
        value: { types: mimes, dropEffect: "" },
      });
      result = target.dispatchEvent(event);
    });
    return result;
  }

  test("pile invokes onJokerDrop when a joker is dropped on it", () => {
    const onJokerDrop = vi.fn();
    render(
      <DeckPile
        remaining={createDeck()}
        jokerDropEnabled
        onJokerDrop={onJokerDrop}
      />,
    );
    const pile = screen.getByRole("button", { name: /Deck/ });
    dispatchDrag(pile, "drop", ["application/x-browslatro-joker"]);
    expect(onJokerDrop).toHaveBeenCalledTimes(1);
  });

  test("pile ignores a drop that is not a joker", () => {
    const onJokerDrop = vi.fn();
    render(
      <DeckPile
        remaining={createDeck()}
        jokerDropEnabled
        onJokerDrop={onJokerDrop}
      />,
    );
    const pile = screen.getByRole("button", { name: /Deck/ });
    dispatchDrag(pile, "drop", ["text/plain"]);
    expect(onJokerDrop).not.toHaveBeenCalled();
  });

  test("pile does not accept a joker drop when jokerDropEnabled is false", () => {
    const onJokerDrop = vi.fn();
    render(
      <DeckPile
        remaining={createDeck()}
        jokerDropEnabled={false}
        onJokerDrop={onJokerDrop}
      />,
    );
    const pile = screen.getByRole("button", { name: /Deck/ });
    dispatchDrag(pile, "drop", ["application/x-browslatro-joker"]);
    expect(onJokerDrop).not.toHaveBeenCalled();
  });

  test("renders the Sell overlay when jokerDropEnabled is true", () => {
    render(
      <DeckPile
        remaining={createDeck()}
        jokerDropEnabled
        onJokerDrop={() => {}}
      />,
    );
    expect(
      screen.getByTestId("consumable-drop-overlay-sell"),
    ).toHaveTextContent("Sell");
  });

  test("a consumable drop on a joker-enabled pile does not fire onJokerDrop", () => {
    const onJokerDrop = vi.fn();
    render(
      <DeckPile
        remaining={createDeck()}
        jokerDropEnabled
        onJokerDrop={onJokerDrop}
      />,
    );
    const pile = screen.getByRole("button", { name: /Deck/ });
    dispatchDrag(pile, "drop", ["application/x-browslatro-consumable"]);
    expect(onJokerDrop).not.toHaveBeenCalled();
  });
});
