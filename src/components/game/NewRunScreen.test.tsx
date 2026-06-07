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
});
