import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Card from "./Card";
import type { Card as CardType } from "../../cards/types";

const plain: CardType = { id: 1, rank: "9", suit: "spades" };
const stoneCard: CardType = { id: 2, rank: "2", suit: "hearts", enhancement: "stone" };
const glassCard: CardType = { id: 3, rank: "Q", suit: "diamonds", enhancement: "glass" };
const luckyCard: CardType = { id: 4, rank: "A", suit: "clubs", enhancement: "lucky" };

describe("Card tooltip — open / close affordances", () => {
  test("no tooltip is rendered on initial mount", () => {
    render(<Card card={plain} />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  test("hovering the card renders a tooltip", async () => {
    const user = userEvent.setup();
    render(<Card card={plain} />);
    await user.hover(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  test("unhovering the card removes the tooltip", async () => {
    const user = userEvent.setup();
    render(<Card card={plain} />);
    await user.hover(screen.getByRole("button"));
    await user.unhover(screen.getByRole("button"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  test("focusing the card renders a tooltip (keyboard a11y)", () => {
    render(<Card card={plain} />);
    fireEvent.focus(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  test("blurring the card removes the tooltip", () => {
    render(<Card card={plain} />);
    const button = screen.getByRole("button");
    fireEvent.focus(button);
    fireEvent.blur(button);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  test("pressing Escape while the tooltip is open dismisses it", async () => {
    const user = userEvent.setup();
    render(<Card card={plain} />);
    await user.hover(screen.getByRole("button"));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});

describe("Card tooltip — accessibility wiring", () => {
  test("the card button references the tooltip via aria-describedby while open", async () => {
    const user = userEvent.setup();
    render(<Card card={plain} />);
    const button = screen.getByRole("button");
    await user.hover(button);
    const tooltip = screen.getByRole("tooltip");
    expect(button).toHaveAttribute("aria-describedby", tooltip.id);
  });

  test("the card button does not carry aria-describedby while closed", () => {
    render(<Card card={plain} />);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-describedby");
  });
});

describe("Card tooltip — content per card state", () => {
  test("renders the rank for a plain card", async () => {
    const user = userEvent.setup();
    render(<Card card={plain} />);
    await user.hover(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("9");
  });

  test("includes the suit label in the tooltip's accessible content for a plain card", async () => {
    const user = userEvent.setup();
    render(<Card card={plain} />);
    await user.hover(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("9 of Spades");
  });

  test("shows the base chip value for a plain card", async () => {
    const user = userEvent.setup();
    render(<Card card={plain} />);
    await user.hover(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Base chips:");
  });

  test("renders the enhancement name when the card has one", async () => {
    const user = userEvent.setup();
    render(<Card card={glassCard} />);
    await user.hover(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Glass");
  });

  test("renders the enhancement description when the card has one", async () => {
    const user = userEvent.setup();
    render(<Card card={glassCard} />);
    await user.hover(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toHaveTextContent(/chance to break/);
  });

  test("omits the enhancement line on a plain card", async () => {
    const user = userEvent.setup();
    render(<Card card={plain} />);
    await user.hover(screen.getByRole("button"));
    expect(screen.queryByText(/—/)).not.toBeInTheDocument();
  });

  test("renders the Lucky description for a Lucky card", async () => {
    const user = userEvent.setup();
    render(<Card card={luckyCard} />);
    await user.hover(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toHaveTextContent(/Mult/);
  });

  test("labels a stone card as a Stone card in the tooltip", async () => {
    const user = userEvent.setup();
    render(<Card card={stoneCard} />);
    await user.hover(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Stone card");
  });

  test("omits the Base chips row for a stone card", async () => {
    const user = userEvent.setup();
    render(<Card card={stoneCard} />);
    await user.hover(screen.getByRole("button"));
    expect(screen.queryByText(/Base chips:/)).not.toBeInTheDocument();
  });
});
