import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Card from "./Card";
import type { Card as CardType } from "../../cards/types";

const aceOfSpades: CardType = { id: 1, rank: "A", suit: "spades" };
const queenOfHearts: CardType = { id: 2, rank: "Q", suit: "hearts" };
const jackOfClubs: CardType = { id: 3, rank: "J", suit: "clubs" };
const kingOfDiamonds: CardType = { id: 4, rank: "K", suit: "diamonds" };
const sevenOfHearts: CardType = { id: 5, rank: "7", suit: "hearts" };

describe("Card", () => {
  test("applies the foil edition class when the card has the foil edition", () => {
    render(<Card card={{ ...aceOfSpades, edition: "foil" }} />);
    expect(screen.getByRole("button")).toHaveClass("card-edition-foil");
  });

  test("applies the polychrome edition class when the card has the polychrome edition", () => {
    render(<Card card={{ ...aceOfSpades, edition: "polychrome" }} />);
    expect(screen.getByRole("button")).toHaveClass("card-edition-polychrome");
  });

  test("does not apply any edition class when the card has no edition (negative)", () => {
    const button = render(<Card card={aceOfSpades} />).getByRole("button");
    expect(button.className).not.toMatch(/card-edition-/);
  });

  test("exposes the edition via the data-edition attribute when present", () => {
    render(<Card card={{ ...aceOfSpades, edition: "holographic" }} />);
    expect(screen.getByRole("button")).toHaveAttribute("data-edition", "holographic");
  });

  test("includes the edition name in the accessible label", () => {
    render(<Card card={{ ...aceOfSpades, edition: "foil" }} />);
    expect(
      screen.getByRole("button", { name: /A of Spades.*Foil/ }),
    ).toBeInTheDocument();
  });

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

  test.each<{ suit: "spades" | "hearts" | "diamonds" | "clubs"; card: CardType }>([
    { suit: "spades", card: aceOfSpades },
    { suit: "hearts", card: queenOfHearts },
    { suit: "diamonds", card: { id: 3, rank: "5", suit: "diamonds" } },
    { suit: "clubs", card: { id: 4, rank: "7", suit: "clubs" } },
  ])("applies the per-suit class for $suit", ({ suit, card }) => {
    render(<Card card={card} />);
    expect(screen.getByRole("button")).toHaveClass(`card-suit-${suit}`);
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
    const onToggle = vi.fn();
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

  test("applies the newly-drawn class when the newlyDrawn prop is set", () => {
    render(<Card card={aceOfSpades} newlyDrawn />);
    expect(screen.getByRole("button")).toHaveClass("card-newly-drawn");
  });

  test("marks the aria-label as newly drawn when the newlyDrawn prop is set", () => {
    render(<Card card={aceOfSpades} newlyDrawn />);
    expect(
      screen.getByRole("button", { name: "A of Spades, newly drawn" })
    ).toBeInTheDocument();
  });

  test("does not apply the newly-drawn class by default (negative)", () => {
    render(<Card card={aceOfSpades} />);
    expect(screen.getByRole("button")).not.toHaveClass("card-newly-drawn");
  });

  test("invokes onDiscardEnd with the card when the discard animation ends", () => {
    const onDiscardEnd = vi.fn();
    render(
      <Card card={aceOfSpades} discarding onDiscardEnd={onDiscardEnd} />
    );
    fireEvent.animationEnd(screen.getByRole("button"));
    expect(onDiscardEnd).toHaveBeenCalledWith(aceOfSpades);
  });

  test("does not invoke onDiscardEnd on animation end when not discarding", () => {
    const onDiscardEnd = vi.fn();
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

  test("applies the gold enhancement class when the card is gold", () => {
    const gold: CardType = { id: 9, rank: "5", suit: "spades", enhancement: "gold" };
    render(<Card card={gold} />);
    expect(screen.getByRole("button")).toHaveClass("card-enhancement-gold");
  });

  test("does not apply any enhancement class to a vanilla card", () => {
    render(<Card card={aceOfSpades} />);
    expect(screen.getByRole("button").className).not.toMatch(/card-enhancement-/);
  });

  test("appends the enhancement to the accessible label when gold", () => {
    const gold: CardType = { id: 9, rank: "5", suit: "spades", enhancement: "gold" };
    render(<Card card={gold} />);
    expect(screen.getByRole("button")).toHaveAccessibleName("5 of Spades (Gold, +$3)");
  });

  test("does not append an enhancement suffix to a vanilla card's accessible label", () => {
    render(<Card card={aceOfSpades} />);
    expect(screen.getByRole("button")).toHaveAccessibleName("A of Spades");
  });

  test("applies the gold scoring class when goldScoring is true", () => {
    const gold: CardType = { id: 9, rank: "5", suit: "spades", enhancement: "gold" };
    render(<Card card={gold} goldScoring />);
    expect(screen.getByRole("button")).toHaveClass("card-gold-scoring");
  });

  test("does not apply the gold scoring class when goldScoring is omitted", () => {
    const gold: CardType = { id: 9, rank: "5", suit: "spades", enhancement: "gold" };
    render(<Card card={gold} />);
    expect(screen.getByRole("button")).not.toHaveClass("card-gold-scoring");
  });

  test("applies the steel scoring class when steelScoring is true", () => {
    const steel: CardType = { id: 20, rank: "A", suit: "spades", enhancement: "steel" };
    render(<Card card={steel} steelScoring />);
    expect(screen.getByRole("button")).toHaveClass("card-steel-scoring");
  });

  test("does not apply the steel scoring class when steelScoring is omitted", () => {
    const steel: CardType = { id: 21, rank: "A", suit: "spades", enhancement: "steel" };
    render(<Card card={steel} />);
    expect(screen.getByRole("button")).not.toHaveClass("card-steel-scoring");
  });

  test("exposes a steel-scoring-<id> testid while steelScoring is true", () => {
    const steel: CardType = { id: 22, rank: "A", suit: "spades", enhancement: "steel" };
    render(<Card card={steel} steelScoring />);
    expect(screen.getByTestId("steel-scoring-22")).toBeInTheDocument();
  });

  test("omits the steel-scoring testid when steelScoring is false", () => {
    const steel: CardType = { id: 23, rank: "A", suit: "spades", enhancement: "steel" };
    render(<Card card={steel} />);
    expect(screen.queryByTestId("steel-scoring-23")).not.toBeInTheDocument();
  });

  test.each<{ enhancement: "steel" | "bonus" | "mult" | "wild" | "glass" | "lucky"; card: CardType }>([
    { enhancement: "steel", card: { id: 10, rank: "A", suit: "hearts", enhancement: "steel" } },
    { enhancement: "bonus", card: { id: 11, rank: "7", suit: "clubs", enhancement: "bonus" } },
    { enhancement: "mult", card: { id: 12, rank: "9", suit: "diamonds", enhancement: "mult" } },
    { enhancement: "wild", card: { id: 13, rank: "K", suit: "hearts", enhancement: "wild" } },
    { enhancement: "glass", card: { id: 14, rank: "4", suit: "spades", enhancement: "glass" } },
    { enhancement: "lucky", card: { id: 16, rank: "3", suit: "hearts", enhancement: "lucky" } },
  ])("applies the $enhancement enhancement class when the card is $enhancement", ({ enhancement, card }) => {
    render(<Card card={card} />);
    expect(screen.getByRole("button")).toHaveClass(`card-enhancement-${enhancement}`);
  });

  test.each<{ enhancement: string; accessibleName: string; card: CardType }>([
    { enhancement: "steel", accessibleName: "A of Hearts (Steel, ×1.5 Mult)", card: { id: 10, rank: "A", suit: "hearts", enhancement: "steel" } },
    { enhancement: "bonus", accessibleName: "7 of Clubs (Bonus, +30 chips)", card: { id: 11, rank: "7", suit: "clubs", enhancement: "bonus" } },
    { enhancement: "mult", accessibleName: "9 of Diamonds (Mult, +4 Mult)", card: { id: 12, rank: "9", suit: "diamonds", enhancement: "mult" } },
    { enhancement: "wild", accessibleName: "K of Hearts (Wild)", card: { id: 13, rank: "K", suit: "hearts", enhancement: "wild" } },
    { enhancement: "lucky", accessibleName: "Q of Hearts (Lucky, 1 in 5 for +20 Mult, 1 in 15 for +$20)", card: { id: 16, rank: "Q", suit: "hearts", enhancement: "lucky" } },
  ])("appends the $enhancement suffix to the accessible label", ({ accessibleName, card }) => {
    render(<Card card={card} />);
    expect(screen.getByRole("button")).toHaveAccessibleName(accessibleName);
  });

  test("renders the enhancement value in the center slot of an enhanced number card", () => {
    const bonus: CardType = { id: 61, rank: "5", suit: "spades", enhancement: "bonus" };
    render(<Card card={bonus} />);
    expect(screen.getByTestId("card-center-value-61")).toHaveTextContent("+30");
  });

  test("keeps the corner suit pip on a card with a center value", () => {
    const bonus: CardType = { id: 62, rank: "5", suit: "spades", enhancement: "bonus" };
    const { container } = render(<Card card={bonus} />);
    expect(container.querySelector(".card-corner-top .card-suit")).toHaveTextContent("\u2660");
  });

  test("does not render a center value on a non-enhanced card", () => {
    render(<Card card={aceOfSpades} />);
    expect(screen.queryByTestId("card-center-value-1")).not.toBeInTheDocument();
  });

  test("keeps the center suit pip on a non-enhanced card", () => {
    const { container } = render(<Card card={aceOfSpades} />);
    expect(container.querySelector(".card-center")).toHaveTextContent("\u2660");
  });

  test("hides the center value on a face-down enhanced card", () => {
    const bonus: CardType = {
      id: 63,
      rank: "5",
      suit: "spades",
      enhancement: "bonus",
      faceDown: true,
    };
    render(<Card card={bonus} />);
    expect(screen.queryByTestId("card-center-value-63")).not.toBeInTheDocument();
  });

  test("keeps the center decoration on an enhanced face card", () => {
    const gold: CardType = { id: 64, rank: "K", suit: "hearts", enhancement: "gold" };
    render(<Card card={gold} />);
    expect(screen.queryByTestId("card-center-value-64")).not.toBeInTheDocument();
  });

  test("keeps the center suit pip on a wild card with no display value", () => {
    const wild: CardType = { id: 65, rank: "3", suit: "hearts", enhancement: "wild" };
    const { container } = render(<Card card={wild} />);
    expect(container.querySelector(".card-center")).toHaveTextContent("\u2665");
  });

  test("renders the clover icon and both odds in the center of a lucky number card", () => {
    const lucky: CardType = { id: 71, rank: "9", suit: "hearts", enhancement: "lucky" };
    render(<Card card={lucky} />);
    const center = screen.getByTestId("card-center-lucky-71");
    expect(center).toHaveTextContent("\u2618");
    expect(center).toHaveTextContent("1 in 5 \u2605");
    expect(center).toHaveTextContent("1 in 15 $");
  });

  test("does not render the lucky center treatment on a non-lucky card", () => {
    const bonus: CardType = { id: 72, rank: "9", suit: "clubs", enhancement: "bonus" };
    render(<Card card={bonus} />);
    expect(screen.queryByTestId("card-center-lucky-72")).not.toBeInTheDocument();
  });

  test("hides the lucky center treatment on a face-down lucky card", () => {
    const lucky: CardType = {
      id: 73,
      rank: "9",
      suit: "hearts",
      enhancement: "lucky",
      faceDown: true,
    };
    render(<Card card={lucky} />);
    expect(screen.queryByTestId("card-center-lucky-73")).not.toBeInTheDocument();
  });

  test("keeps the center decoration on a lucky face card", () => {
    const lucky: CardType = { id: 74, rank: "Q", suit: "diamonds", enhancement: "lucky" };
    render(<Card card={lucky} />);
    expect(screen.queryByTestId("card-center-lucky-74")).not.toBeInTheDocument();
  });

  test("applies the stone enhancement class when the card is stone", () => {
    const stone: CardType = { id: 15, rank: "2", suit: "spades", enhancement: "stone" };
    render(<Card card={stone} />);
    expect(screen.getByRole("button")).toHaveClass("card-enhancement-stone");
  });

  test("uses 'Stone card' as the accessible name (rank/suit are invisible)", () => {
    const stone: CardType = { id: 15, rank: "2", suit: "spades", enhancement: "stone" };
    render(<Card card={stone} />);
    expect(screen.getByRole("button")).toHaveAccessibleName("Stone card");
  });

  test("does not render the rank label for a Stone card", () => {
    const stone: CardType = { id: 15, rank: "2", suit: "spades", enhancement: "stone" };
    render(<Card card={stone} />);
    expect(screen.queryByText("2")).not.toBeInTheDocument();
  });

  test("does not render the suit pip for a Stone card", () => {
    const stone: CardType = { id: 15, rank: "2", suit: "spades", enhancement: "stone" };
    const { container } = render(<Card card={stone} />);
    expect(container.querySelector(".card-suit")).toBeNull();
  });

  test("renders a seal badge when the card has a Gold Seal", () => {
    const sealed: CardType = { id: 30, rank: "5", suit: "spades", seal: "gold" };
    render(<Card card={sealed} />);
    expect(screen.getByTestId("card-seal-30")).toBeInTheDocument();
  });

  test.each<{ seal: "gold" | "red" | "blue" | "purple"; card: CardType }>([
    { seal: "gold", card: { id: 31, rank: "5", suit: "spades", seal: "gold" } },
    { seal: "red", card: { id: 32, rank: "6", suit: "hearts", seal: "red" } },
    { seal: "blue", card: { id: 33, rank: "7", suit: "clubs", seal: "blue" } },
    { seal: "purple", card: { id: 34, rank: "8", suit: "diamonds", seal: "purple" } },
  ])("applies the $seal seal class to the badge", ({ seal, card }) => {
    render(<Card card={card} />);
    expect(screen.getByTestId(`card-seal-${card.id}`)).toHaveClass(
      `card-seal-badge-${seal}`,
    );
  });

  test("does not render a seal badge for a card without a seal", () => {
    render(<Card card={aceOfSpades} />);
    expect(screen.queryByTestId("card-seal-1")).not.toBeInTheDocument();
  });

  test("appends the seal name to the accessible label", () => {
    const sealed: CardType = { id: 35, rank: "9", suit: "spades", seal: "blue" };
    render(<Card card={sealed} />);
    expect(screen.getByRole("button")).toHaveAccessibleName(
      "9 of Spades, Blue Seal",
    );
  });

  test("combines enhancement and seal in the accessible label", () => {
    const sealed: CardType = {
      id: 36,
      rank: "K",
      suit: "diamonds",
      enhancement: "gold",
      seal: "red",
    };
    render(<Card card={sealed} />);
    expect(screen.getByRole("button")).toHaveAccessibleName(
      "K of Diamonds (Gold, +$3), Red Seal",
    );
  });
});

describe("Card scoring pulse animation", () => {
  test("does not apply card-scoring when scoring is false", () => {
    render(<Card card={aceOfSpades} scoring={false} />);
    expect(screen.getByRole("button")).not.toHaveClass("card-scoring");
  });

  test("applies card-scoring when scoring is true", () => {
    render(<Card card={aceOfSpades} scoring />);
    expect(screen.getByRole("button")).toHaveClass("card-scoring");
  });

  test("applies card-scoring-tick-0 when the pulse tick is even", () => {
    render(<Card card={aceOfSpades} scoring scoringPulseTick={0} />);
    expect(screen.getByRole("button")).toHaveClass("card-scoring-tick-0");
  });

  test("applies card-scoring-tick-1 when the pulse tick is odd", () => {
    render(<Card card={aceOfSpades} scoring scoringPulseTick={1} />);
    expect(screen.getByRole("button")).toHaveClass("card-scoring-tick-1");
  });

  test("alternates tick classes across consecutive ticks (so a Red Seal retrigger restarts the animation)", () => {
    const { rerender } = render(
      <Card card={aceOfSpades} scoring scoringPulseTick={3} />,
    );
    expect(screen.getByRole("button")).toHaveClass("card-scoring-tick-1");
    rerender(<Card card={aceOfSpades} scoring scoringPulseTick={4} />);
    expect(screen.getByRole("button")).toHaveClass("card-scoring-tick-0");
  });

  test("a non-scoring card does not carry either tick class", () => {
    render(<Card card={aceOfSpades} scoring={false} scoringPulseTick={5} />);
    const button = screen.getByRole("button");
    expect(button).not.toHaveClass("card-scoring-tick-0");
  });
});

describe("Card face-down hides seal/enhancement/edition", () => {
  test("a face-down lucky card does not apply the enhancement class", () => {
    const lucky: CardType = {
      id: 40,
      rank: "3",
      suit: "hearts",
      enhancement: "lucky",
      faceDown: true,
    };
    render(<Card card={lucky} />);
    expect(screen.getByRole("button")).not.toHaveClass("card-enhancement-lucky");
  });

  test("a face-down blue-seal card does not apply the seal class", () => {
    const sealed: CardType = {
      id: 41,
      rank: "7",
      suit: "clubs",
      seal: "blue",
      faceDown: true,
    };
    render(<Card card={sealed} />);
    expect(screen.getByRole("button")).not.toHaveClass("card-seal-blue");
  });

  test("a face-down card with a seal does not render the seal badge", () => {
    const sealed: CardType = {
      id: 42,
      rank: "5",
      suit: "spades",
      seal: "gold",
      faceDown: true,
    };
    render(<Card card={sealed} />);
    expect(screen.queryByTestId("card-seal-42")).not.toBeInTheDocument();
  });

  test("a face-down foil card does not apply the edition class", () => {
    const editioned: CardType = {
      id: 43,
      rank: "8",
      suit: "diamonds",
      edition: "foil",
      faceDown: true,
    };
    render(<Card card={editioned} />);
    expect(screen.getByRole("button").className).not.toMatch(/card-edition-/);
  });

  test("a face-down card flipped face-up restores its enhancement class (regression)", () => {
    const lucky: CardType = {
      id: 44,
      rank: "3",
      suit: "hearts",
      enhancement: "lucky",
      faceDown: false,
    };
    render(<Card card={lucky} />);
    expect(screen.getByRole("button")).toHaveClass("card-enhancement-lucky");
  });

  test("a face-down card flipped face-up restores its seal badge (regression)", () => {
    const sealed: CardType = {
      id: 45,
      rank: "5",
      suit: "spades",
      seal: "gold",
      faceDown: false,
    };
    render(<Card card={sealed} />);
    expect(screen.getByTestId("card-seal-45")).toBeInTheDocument();
  });

  test("a face-down card scoring renders its enhancement class (showBack flips off during scoring)", () => {
    const lucky: CardType = {
      id: 46,
      rank: "3",
      suit: "hearts",
      enhancement: "lucky",
      faceDown: true,
    };
    render(<Card card={lucky} scoring />);
    expect(screen.getByRole("button")).toHaveClass("card-enhancement-lucky");
  });
});

describe("Card accessible-name vs visible-text", () => {
  test("top corner visible glyphs are aria-hidden so they do not duplicate the aria-label", () => {
    const { container } = render(<Card card={aceOfSpades} />);
    const corner = container.querySelector(".card-corner-top");
    expect(corner).toHaveAttribute("aria-hidden", "true");
  });

  test("the button's accessible name still comes from the aria-label", () => {
    render(<Card card={aceOfSpades} />);
    expect(screen.getByRole("button")).toHaveAccessibleName("A of Spades");
  });
});
