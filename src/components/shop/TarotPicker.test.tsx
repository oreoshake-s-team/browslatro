import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TarotPicker from "./TarotPicker";
import type { Card } from "../../types";
import { createTarotCatalog, type TarotCard } from "../../tarots";

function tarot(id: string): TarotCard {
  const found = createTarotCatalog().find((t) => t.id === id);
  if (!found) throw new Error(`tarot ${id} missing`);
  return found;
}

const hand: ReadonlyArray<Card> = [
  { id: 1, rank: "2", suit: "spades" },
  { id: 2, rank: "5", suit: "hearts" },
  { id: 3, rank: "K", suit: "clubs" },
];

const noop = (): void => {};

describe("TarotPicker — initial render", () => {
  test("renders the tarot's name as the dialog heading", () => {
    render(
      <TarotPicker
        tarot={tarot("the-lovers")}
        hand={hand}
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    expect(screen.getByRole("heading", { name: "The Lovers" })).toBeInTheDocument();
  });

  test("renders a button per card in the hand", () => {
    render(
      <TarotPicker
        tarot={tarot("the-lovers")}
        hand={hand}
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(hand.length);
  });

  test("Confirm starts disabled (no cards picked)", () => {
    render(
      <TarotPicker
        tarot={tarot("the-lovers")}
        hand={hand}
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
  });
});

describe("TarotPicker — selection (maxTargets = 1)", () => {
  test("clicking a card marks it picked (aria-pressed=true)", async () => {
    const user = userEvent.setup();
    render(
      <TarotPicker
        tarot={tarot("the-lovers")}
        hand={hand}
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    await user.click(screen.getByRole("button", { name: /2 of spades/ }));
    expect(screen.getByRole("button", { name: /2 of spades/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("clicking a picked card unpicks it", async () => {
    const user = userEvent.setup();
    render(
      <TarotPicker
        tarot={tarot("the-lovers")}
        hand={hand}
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    const btn = screen.getByRole("button", { name: /2 of spades/ });
    await user.click(btn);
    await user.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "false");
  });

  test("a second pick is rejected when maxTargets is 1", async () => {
    const user = userEvent.setup();
    render(
      <TarotPicker
        tarot={tarot("the-lovers")}
        hand={hand}
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    await user.click(screen.getByRole("button", { name: /2 of spades/ }));
    await user.click(screen.getByRole("button", { name: /5 of hearts/ }));
    expect(screen.getByRole("button", { name: /5 of hearts/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

describe("TarotPicker — selection (maxTargets = 2)", () => {
  test("two picks are allowed", async () => {
    const user = userEvent.setup();
    render(
      <TarotPicker
        tarot={tarot("the-magician")}
        hand={hand}
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    await user.click(screen.getByRole("button", { name: /2 of spades/ }));
    await user.click(screen.getByRole("button", { name: /5 of hearts/ }));
    expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(2);
  });

  test("a third pick is rejected when maxTargets is 2", async () => {
    const user = userEvent.setup();
    render(
      <TarotPicker
        tarot={tarot("the-magician")}
        hand={hand}
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    await user.click(screen.getByRole("button", { name: /2 of spades/ }));
    await user.click(screen.getByRole("button", { name: /5 of hearts/ }));
    await user.click(screen.getByRole("button", { name: /K of clubs/ }));
    expect(screen.getByRole("button", { name: /K of clubs/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

describe("TarotPicker — confirm and cancel", () => {
  test("Confirm invokes onConfirm with the picked card ids", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <TarotPicker
        tarot={tarot("the-lovers")}
        hand={hand}
        onConfirm={onConfirm}
        onCancel={noop}
      />,
    );
    await user.click(screen.getByRole("button", { name: /2 of spades/ }));
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledWith([1]);
  });

  test("Cancel invokes onCancel without calling onConfirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <TarotPicker
        tarot={tarot("the-lovers")}
        hand={hand}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test("clicking the overlay backdrop cancels the picker", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <TarotPicker
        tarot={tarot("the-lovers")}
        hand={hand}
        onConfirm={noop}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByRole("dialog"));
    expect(onCancel).toHaveBeenCalled();
  });

  test("pressing Escape cancels the picker", () => {
    const onCancel = vi.fn();
    render(
      <TarotPicker
        tarot={tarot("the-lovers")}
        hand={hand}
        onConfirm={noop}
        onCancel={onCancel}
      />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).toHaveBeenCalled();
  });
});
