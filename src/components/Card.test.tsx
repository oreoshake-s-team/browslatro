import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Card from "./Card";
import type { Card as CardType } from "../types";

const aceOfSpades: CardType = { id: 1, rank: "A", suit: "spades" };
const queenOfHearts: CardType = { id: 2, rank: "Q", suit: "hearts" };
const jackOfClubs: CardType = { id: 3, rank: "J", suit: "clubs" };
const kingOfDiamonds: CardType = { id: 4, rank: "K", suit: "diamonds" };
const sevenOfHearts: CardType = { id: 5, rank: "7", suit: "hearts" };

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

  test("applies the per-suit class for spades", () => {
    render(<Card card={aceOfSpades} />);
    expect(screen.getByRole("button")).toHaveClass("card-suit-spades");
  });

  test("applies the per-suit class for hearts", () => {
    render(<Card card={queenOfHearts} />);
    expect(screen.getByRole("button")).toHaveClass("card-suit-hearts");
  });

  test("applies the per-suit class for diamonds", () => {
    const fiveOfDiamonds: CardType = { id: 3, rank: "5", suit: "diamonds" };
    render(<Card card={fiveOfDiamonds} />);
    expect(screen.getByRole("button")).toHaveClass("card-suit-diamonds");
  });

  test("applies the per-suit class for clubs", () => {
    const sevenOfClubs: CardType = { id: 4, rank: "7", suit: "clubs" };
    render(<Card card={sevenOfClubs} />);
    expect(screen.getByRole("button")).toHaveClass("card-suit-clubs");
  });

  test("does not apply an unrelated suit class", () => {
    render(<Card card={aceOfSpades} />);
    expect(screen.getByRole("button")).not.toHaveClass("card-suit-hearts");
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

  test("invokes onToggle with the card when clicked", async () => {
    const user = userEvent.setup();
    const onToggle = jest.fn();
    render(<Card card={aceOfSpades} onToggle={onToggle} />);
    await user.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledWith(aceOfSpades);
  });

  test("does not throw when clicked without an onToggle handler", async () => {
    const user = userEvent.setup();
    render(<Card card={aceOfSpades} />);
    await expect(
      user.click(screen.getByRole("button"))
    ).resolves.toBeUndefined();
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

  test("applies the shared face-card class to a Jack", () => {
    render(<Card card={jackOfClubs} />);
    expect(screen.getByRole("button")).toHaveClass("card-face");
  });

  test("applies the jack-specific class to a Jack", () => {
    render(<Card card={jackOfClubs} />);
    expect(screen.getByRole("button")).toHaveClass("card-face-jack");
  });

  test("applies the queen-specific class to a Queen", () => {
    render(<Card card={queenOfHearts} />);
    expect(screen.getByRole("button")).toHaveClass("card-face-queen");
  });

  test("applies the king-specific class to a King", () => {
    render(<Card card={kingOfDiamonds} />);
    expect(screen.getByRole("button")).toHaveClass("card-face-king");
  });

  test("does not apply the face-card class to a number card", () => {
    render(<Card card={sevenOfHearts} />);
    expect(screen.getByRole("button")).not.toHaveClass("card-face");
  });

  test("does not apply the face-card class to an Ace", () => {
    render(<Card card={aceOfSpades} />);
    expect(screen.getByRole("button")).not.toHaveClass("card-face");
  });
});
