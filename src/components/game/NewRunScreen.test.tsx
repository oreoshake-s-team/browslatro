import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import NewRunScreen from "./NewRunScreen";

describe("NewRunScreen", () => {
  test("renders one button per implemented stake", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    expect(screen.getAllByRole("radio", { name: /Stake/i })).toHaveLength(8);
  });

  test("renders the Black stake tile (implemented in #555)", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    expect(screen.getByTestId("new-run-stake-black")).toBeInTheDocument();
  });

  test("renders the Blue stake tile (implemented in #556)", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    expect(screen.getByTestId("new-run-stake-blue")).toBeInTheDocument();
  });

  test("renders the Purple stake tile (implemented in #557)", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    expect(screen.getByTestId("new-run-stake-purple")).toBeInTheDocument();
  });

  test("renders the Orange stake tile (implemented in #558)", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    expect(screen.getByTestId("new-run-stake-orange")).toBeInTheDocument();
  });

  test("renders the Gold stake tile (implemented in #559)", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    expect(screen.getByTestId("new-run-stake-gold")).toBeInTheDocument();
  });

  test("renders the Green stake tile (implemented)", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    expect(screen.getByTestId("new-run-stake-green")).toBeInTheDocument();
  });

  test("renders the Red stake tile (implemented)", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    expect(screen.getByTestId("new-run-stake-red")).toBeInTheDocument();
  });

  test("initial stake defaults to White", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    expect(screen.getByTestId("new-run-stake-white")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("respects an initialStake override", () => {
    render(<NewRunScreen initialStake="red" onConfirm={vi.fn()} />);
    expect(screen.getByTestId("new-run-stake-red")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("clicking a stake tile selects it (visual + aria)", async () => {
    const user = userEvent.setup();
    render(<NewRunScreen onConfirm={vi.fn()} />);
    await user.click(screen.getByTestId("new-run-stake-red"));
    expect(screen.getByTestId("new-run-stake-red")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("the description region updates to the selected stake", async () => {
    const user = userEvent.setup();
    render(<NewRunScreen onConfirm={vi.fn()} />);
    await user.click(screen.getByTestId("new-run-stake-red"));
    expect(screen.getByTestId("new-run-stake-description")).toHaveTextContent(
      "Red Stake",
    );
  });

  test("White selected shows only the White effect entry (closes #833)", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    expect(
      screen.getByTestId("new-run-stake-description").querySelectorAll("li"),
    ).toHaveLength(1);
  });

  test("Red selected shows Red on top then White below (selected-first order, closes #833)", async () => {
    const user = userEvent.setup();
    render(<NewRunScreen onConfirm={vi.fn()} />);
    await user.click(screen.getByTestId("new-run-stake-red"));
    const entries = screen
      .getByTestId("new-run-stake-description")
      .querySelectorAll("li");
    expect(Array.from(entries).map((el) => el.getAttribute("data-testid"))).toEqual([
      "new-run-stake-effect-red",
      "new-run-stake-effect-white",
    ]);
  });

  test("Gold selected shows all 8 cumulative effects, gold-first then descending (closes #833)", async () => {
    const user = userEvent.setup();
    render(<NewRunScreen onConfirm={vi.fn()} />);
    await user.click(screen.getByTestId("new-run-stake-gold"));
    const entries = screen
      .getByTestId("new-run-stake-description")
      .querySelectorAll("li");
    expect(Array.from(entries).map((el) => el.getAttribute("data-testid"))).toEqual([
      "new-run-stake-effect-gold",
      "new-run-stake-effect-orange",
      "new-run-stake-effect-purple",
      "new-run-stake-effect-blue",
      "new-run-stake-effect-black",
      "new-run-stake-effect-green",
      "new-run-stake-effect-red",
      "new-run-stake-effect-white",
    ]);
  });

  test("the currently-selected stake entry is marked data-selected (closes #833)", async () => {
    const user = userEvent.setup();
    render(<NewRunScreen onConfirm={vi.fn()} />);
    await user.click(screen.getByTestId("new-run-stake-orange"));
    expect(screen.getByTestId("new-run-stake-effect-orange")).toHaveAttribute(
      "data-selected",
      "true",
    );
  });

  test("non-selected cumulative entries are not marked data-selected (closes #833)", async () => {
    const user = userEvent.setup();
    render(<NewRunScreen onConfirm={vi.fn()} />);
    await user.click(screen.getByTestId("new-run-stake-orange"));
    expect(screen.getByTestId("new-run-stake-effect-red")).not.toHaveAttribute(
      "data-selected",
    );
  });

  test("Black Stake effect text is shown when Gold is selected (closes #833)", async () => {
    const user = userEvent.setup();
    render(<NewRunScreen onConfirm={vi.fn()} />);
    await user.click(screen.getByTestId("new-run-stake-gold"));
    expect(screen.getByTestId("new-run-stake-effect-black")).toHaveTextContent(
      /Eternal/i,
    );
  });

  test("Start Run fires onConfirm with the selected stake", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<NewRunScreen onConfirm={onConfirm} />);
    await user.click(screen.getByTestId("new-run-stake-red"));
    await user.click(screen.getByTestId("new-run-confirm"));
    expect(onConfirm).toHaveBeenCalledWith({
      stake: "red",
      deck: "red-deck",
    });
  });

  test("Start Run defaults to the initial selections when nothing is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<NewRunScreen onConfirm={onConfirm} />);
    await user.click(screen.getByTestId("new-run-confirm"));
    expect(onConfirm).toHaveBeenCalledWith({ stake: "white", deck: "red-deck" });
  });

  test("renders one button per implemented deck", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    expect(screen.getAllByRole("radio", { name: /Deck/i })).toHaveLength(7);
  });

  test("initial deck defaults to Red Deck", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    expect(screen.getByTestId("new-run-deck-red-deck")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("picking Yellow Deck updates aria-checked and onConfirm payload", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<NewRunScreen onConfirm={onConfirm} />);
    await user.click(screen.getByTestId("new-run-deck-yellow-deck"));
    await user.click(screen.getByTestId("new-run-confirm"));
    expect(onConfirm).toHaveBeenCalledWith({
      stake: "white",
      deck: "yellow-deck",
    });
  });

  test("does not render unimplemented decks like Plasma (negative)", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    expect(
      screen.queryByTestId("new-run-deck-plasma-deck"),
    ).not.toBeInTheDocument();
  });

  test("does not render the dialog content twice (negative)", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  test("stake radio group marks exactly one tile as checked", async () => {
    const user = userEvent.setup();
    render(<NewRunScreen onConfirm={vi.fn()} />);
    await user.click(screen.getByTestId("new-run-stake-red"));
    const checked = screen
      .getAllByRole("radio", { name: /Stake/i })
      .filter((r) => r.getAttribute("aria-checked") === "true");
    expect(checked).toHaveLength(1);
  });

  test("Start Run button is focusable for Enter-to-confirm (a11y)", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    fireEvent.focus(screen.getByTestId("new-run-confirm"));
    expect(screen.getByTestId("new-run-confirm")).toHaveFocus();
  });

  test("the deck radiogroup is not a list (#640)", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    const group = screen.getByRole("radiogroup", { name: "Deck variant" });
    expect(group.tagName).toBe("DIV");
  });

  test("the stake radiogroup is not a list (#640)", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    const group = screen.getByRole("radiogroup", { name: "Stake difficulty" });
    expect(group.tagName).toBe("DIV");
  });

  test("initial preview shows 4 Hands / 4 Discards on White Stake + Red Deck (#737)", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    expect(screen.getByTestId("new-run-preview-hands")).toHaveTextContent("4");
    expect(screen.getByTestId("new-run-preview-discards")).toHaveTextContent("4");
  });

  test("picking Yellow Deck updates the Discards preview from 4 to 3 (no Red Deck +1)", async () => {
    const user = userEvent.setup();
    render(<NewRunScreen onConfirm={vi.fn()} />);
    await user.click(screen.getByTestId("new-run-deck-yellow-deck"));
    expect(screen.getByTestId("new-run-preview-discards")).toHaveTextContent("3");
  });

  test("picking Blue Stake on Red Deck updates the Discards preview from 4 to 3 (Red +1, Blue −1)", async () => {
    const user = userEvent.setup();
    render(<NewRunScreen onConfirm={vi.fn()} />);
    await user.click(screen.getByTestId("new-run-stake-blue"));
    expect(screen.getByTestId("new-run-preview-discards")).toHaveTextContent("3");
  });

  test("picking Blue Stake + Yellow Deck shows 2 Discards (base 3 − 1)", async () => {
    const user = userEvent.setup();
    render(<NewRunScreen onConfirm={vi.fn()} />);
    await user.click(screen.getByTestId("new-run-stake-blue"));
    await user.click(screen.getByTestId("new-run-deck-yellow-deck"));
    expect(screen.getByTestId("new-run-preview-discards")).toHaveTextContent("2");
  });

  test("switching back from Blue to White restores Discards to 4 on Red Deck (negative)", async () => {
    const user = userEvent.setup();
    render(<NewRunScreen onConfirm={vi.fn()} />);
    await user.click(screen.getByTestId("new-run-stake-blue"));
    await user.click(screen.getByTestId("new-run-stake-white"));
    expect(screen.getByTestId("new-run-preview-discards")).toHaveTextContent("4");
  });

  test("Hands preview stays at 4 across stake/deck swaps (no current modifier touches Hands)", async () => {
    const user = userEvent.setup();
    render(<NewRunScreen onConfirm={vi.fn()} />);
    await user.click(screen.getByTestId("new-run-stake-blue"));
    await user.click(screen.getByTestId("new-run-deck-yellow-deck"));
    expect(screen.getByTestId("new-run-preview-hands")).toHaveTextContent("4");
  });

  describe("deck tooltip on hover/focus (#835)", () => {
    test("no static deck description paragraph is rendered (replaced by hover tooltip)", () => {
      render(<NewRunScreen onConfirm={vi.fn()} />);
      expect(
        screen.queryByTestId("new-run-deck-description"),
      ).not.toBeInTheDocument();
    });

    test("hovering a deck tile opens a tooltip with that deck's description", async () => {
      const user = userEvent.setup();
      render(<NewRunScreen onConfirm={vi.fn()} />);
      await user.hover(screen.getByTestId("new-run-deck-yellow-deck"));
      expect(screen.getByRole("tooltip")).toHaveTextContent(/Yellow Deck/);
    });

    test("the hovered tooltip carries the deck's effect description", async () => {
      const user = userEvent.setup();
      render(<NewRunScreen onConfirm={vi.fn()} />);
      await user.hover(screen.getByTestId("new-run-deck-yellow-deck"));
      expect(screen.getByRole("tooltip")).toHaveTextContent(/extra/i);
    });

    test("hovering a different deck swaps the tooltip text", async () => {
      const user = userEvent.setup();
      render(<NewRunScreen onConfirm={vi.fn()} />);
      await user.hover(screen.getByTestId("new-run-deck-yellow-deck"));
      await user.unhover(screen.getByTestId("new-run-deck-yellow-deck"));
      await user.hover(screen.getByTestId("new-run-deck-blue-deck"));
      expect(screen.getByRole("tooltip")).toHaveTextContent(/Blue Deck/);
    });

    test("focusing a deck tile via keyboard opens the tooltip", () => {
      render(<NewRunScreen onConfirm={vi.fn()} />);
      const tile = screen.getByTestId("new-run-deck-red-deck");
      fireEvent.focus(tile);
      expect(screen.getByRole("tooltip")).toHaveTextContent(/Red Deck/);
    });

    test("Escape closes an open tooltip (negative)", async () => {
      const user = userEvent.setup();
      render(<NewRunScreen onConfirm={vi.fn()} />);
      await user.hover(screen.getByTestId("new-run-deck-yellow-deck"));
      expect(screen.getByRole("tooltip")).toBeInTheDocument();
      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    test("unhover closes the tooltip (negative)", async () => {
      const user = userEvent.setup();
      render(<NewRunScreen onConfirm={vi.fn()} />);
      const tile = screen.getByTestId("new-run-deck-yellow-deck");
      await user.hover(tile);
      await user.unhover(tile);
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    test("clicking a tile still selects it (selection unaffected by tooltip wiring)", async () => {
      const user = userEvent.setup();
      const onConfirm = vi.fn();
      render(<NewRunScreen onConfirm={onConfirm} />);
      await user.click(screen.getByTestId("new-run-deck-yellow-deck"));
      await user.click(screen.getByTestId("new-run-confirm"));
      expect(onConfirm).toHaveBeenCalledWith({
        stake: "white",
        deck: "yellow-deck",
      });
    });
  });
});
