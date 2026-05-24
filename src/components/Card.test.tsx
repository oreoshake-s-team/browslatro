import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Card from "./Card";
import type { Card as CardType } from "../types";

const aceOfSpades: CardType = { id: 1, rank: "A", suit: "spades" };
const queenOfHearts: CardType = { id: 2, rank: "Q", suit: "hearts" };

describe("Card", () => {
  test("renders the rank label", () => {
    render(<Card card={aceOfSpades} />);
    expect(screen.getAllByText("A").length).toBeGreaterThan(0);
  });

  test("renders an accessible label combining rank and suit", () => {
    render(<Card card={aceOfSpades} />);
    expect(
      screen.getByRole("button", { name: "A of Spades" })
    ).toBeInTheDocument();
  });

  test("applies the red color class for heart suits", () => {
    render(<Card card={queenOfHearts} />);
    expect(screen.getByRole("button")).toHaveClass("card-red");
  });

  test("applies the black color class for spade suits", () => {
    render(<Card card={aceOfSpades} />);
    expect(screen.getByRole("button")).toHaveClass("card-black");
  });

  test("is not selected by default", () => {
    render(<Card card={aceOfSpades} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  test("reflects the selected prop via aria-pressed", () => {
    render(<Card card={aceOfSpades} selected />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  test("applies the selected class when raised", () => {
    render(<Card card={aceOfSpades} selected />);
    expect(screen.getByRole("button")).toHaveClass("card-selected");
  });

  test("invokes onToggle with the card when clicked", () => {
    const onToggle = jest.fn();
    render(<Card card={aceOfSpades} onToggle={onToggle} />);
    userEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledWith(aceOfSpades);
  });

  test("does not throw when clicked without an onToggle handler", () => {
    render(<Card card={aceOfSpades} />);
    expect(() => userEvent.click(screen.getByRole("button"))).not.toThrow();
  });

  test("applies the discarding class when the discarding prop is set", () => {
    render(<Card card={aceOfSpades} discarding />);
    expect(screen.getByRole("button")).toHaveClass("card-discarding");
  });

  test("invokes onDiscardEnd with the card when the discard animation ends", () => {
    const onDiscardEnd = jest.fn();
    render(
      <Card card={aceOfSpades} discarding onDiscardEnd={onDiscardEnd} />
    );
    fireEvent.animationEnd(screen.getByRole("button"));
    expect(onDiscardEnd).toHaveBeenCalledWith(aceOfSpades);
  });

  test("does not invoke onDiscardEnd on animation end when not discarding", () => {
    const onDiscardEnd = jest.fn();
    render(<Card card={aceOfSpades} onDiscardEnd={onDiscardEnd} />);
    fireEvent.animationEnd(screen.getByRole("button"));
    expect(onDiscardEnd).not.toHaveBeenCalled();
  });
});
