import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Card from "./Card";
import type { Card as CardType } from "../../cards/types";
import { usePreferences } from "../system/preferences";

const useTranslationCalls = { count: 0 };

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: (...args: Parameters<typeof actual.useTranslation>) => {
      useTranslationCalls.count++;
      return actual.useTranslation(...args);
    },
  };
});

function noopToggle(): void {}
function noopDiscardEnd(): void {}

function CardMemoHarness() {
  const [, setTick] = useState(0);
  return (
    <div>
      <button onClick={() => setTick((t) => t + 1)}>bump</button>
      <Card
        card={aceOfSpades}
        selected={false}
        onToggle={noopToggle}
        onDiscardEnd={noopDiscardEnd}
      />
    </div>
  );
}

const aceOfSpades: CardType = { id: 1, rank: "A", suit: "spades" };
const queenOfHearts: CardType = { id: 2, rank: "Q", suit: "hearts" };
const jackOfClubs: CardType = { id: 3, rank: "J", suit: "clubs" };
const kingOfDiamonds: CardType = { id: 4, rank: "K", suit: "diamonds" };
const sevenOfHearts: CardType = { id: 5, rank: "7", suit: "hearts" };

describe("Card", () => {
  test("exposes the foil edition via data-edition", () => {
    render(<Card card={{ ...aceOfSpades, edition: "foil" }} />);
    expect(screen.getByRole("button")).toHaveAttribute("data-edition", "foil");
  });

  test("exposes the polychrome edition via data-edition", () => {
    render(<Card card={{ ...aceOfSpades, edition: "polychrome" }} />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "data-edition",
      "polychrome",
    );
  });

  test("carries no data-edition when the card has no edition (negative)", () => {
    const button = render(<Card card={aceOfSpades} />).getByRole("button");
    expect(button).not.toHaveAttribute("data-edition");
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

  test("applies the red suit text color for heart suits", () => {
    render(<Card card={queenOfHearts} />);
    expect(screen.getByRole("button")).toHaveClass("text-suit-red");
  });

  test("applies the dark suit text color for spade suits", () => {
    render(<Card card={aceOfSpades} />);
    expect(screen.getByRole("button")).toHaveClass("text-card-ink");
  });

  test("high visibility colors diamonds blue", () => {
    usePreferences.setState({ highVisibility: true });
    render(<Card card={{ id: 91, rank: "5", suit: "diamonds" }} />);
    expect(screen.getByRole("button")).toHaveClass("text-suit-blue");
  });

  test("high visibility colors clubs green", () => {
    usePreferences.setState({ highVisibility: true });
    render(<Card card={{ id: 92, rank: "5", suit: "clubs" }} />);
    expect(screen.getByRole("button")).toHaveClass("text-suit-green");
  });

  test("classic palette colors diamonds red when high visibility is off", () => {
    usePreferences.setState({ highVisibility: false });
    render(<Card card={{ id: 93, rank: "5", suit: "diamonds" }} />);
    expect(screen.getByRole("button")).toHaveClass("text-suit-red");
    usePreferences.setState({ highVisibility: true });
  });

  test.each<{ suit: "spades" | "hearts" | "diamonds" | "clubs"; card: CardType }>([
    { suit: "spades", card: aceOfSpades },
    { suit: "hearts", card: queenOfHearts },
    { suit: "diamonds", card: { id: 3, rank: "5", suit: "diamonds" } },
    { suit: "clubs", card: { id: 4, rank: "7", suit: "clubs" } },
  ])("exposes data-suit for $suit", ({ suit, card }) => {
    render(<Card card={card} />);
    expect(screen.getByRole("button")).toHaveAttribute("data-suit", suit);
  });

  test("does not expose an unrelated suit", () => {
    render(<Card card={aceOfSpades} />);
    expect(screen.getByRole("button")).not.toHaveAttribute(
      "data-suit",
      "hearts",
    );
  });

  test("is not selected by default", () => {
    render(<Card card={aceOfSpades} />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  test("reflects the selected prop via aria-pressed", () => {
    render(<Card card={aceOfSpades} selected />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  test("lifts the card when selected", () => {
    render(<Card card={aceOfSpades} selected />);
    expect(screen.getByRole("button")).toHaveClass("-translate-y-4");
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

  test("marks the card with data-discarding when the discarding prop is set", () => {
    render(<Card card={aceOfSpades} discarding />);
    expect(screen.getByRole("button")).toHaveAttribute("data-discarding");
  });

  test("plays the fade-in animation when the newlyDrawn prop is set", () => {
    render(<Card card={aceOfSpades} newlyDrawn />);
    expect(screen.getByRole("button")).toHaveClass("animate-fade-in");
  });

  test("marks the aria-label as newly drawn when the newlyDrawn prop is set", () => {
    render(<Card card={aceOfSpades} newlyDrawn />);
    expect(
      screen.getByRole("button", { name: "A of Spades, newly drawn" })
    ).toBeInTheDocument();
  });

  test("does not play the fade-in animation by default (negative)", () => {
    render(<Card card={aceOfSpades} />);
    expect(screen.getByRole("button")).not.toHaveClass("animate-fade-in");
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

  test("renders the face glyph for a Jack", () => {
    render(<Card card={jackOfClubs} />);
    expect(screen.getByText("⚜")).toBeInTheDocument();
  });

  test("renders the queen glyph for a Queen", () => {
    render(<Card card={queenOfHearts} />);
    expect(screen.getByText("♛")).toBeInTheDocument();
  });

  test("renders the king glyph for a King", () => {
    render(<Card card={kingOfDiamonds} />);
    expect(screen.getByText("♚")).toBeInTheDocument();
  });

  test("does not render a face glyph on a number card", () => {
    render(<Card card={sevenOfHearts} />);
    expect(screen.queryByText(/[⚜♛♚]/)).not.toBeInTheDocument();
  });

  test("does not render a face glyph on an Ace", () => {
    render(<Card card={aceOfSpades} />);
    expect(screen.queryByText(/[⚜♛♚]/)).not.toBeInTheDocument();
  });

  test("exposes the gold enhancement via data-enhancement", () => {
    const gold: CardType = { id: 9, rank: "5", suit: "spades", enhancement: "gold" };
    render(<Card card={gold} />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "data-enhancement",
      "gold",
    );
  });

  test("carries no data-enhancement on a vanilla card", () => {
    render(<Card card={aceOfSpades} />);
    expect(screen.getByRole("button")).not.toHaveAttribute("data-enhancement");
  });

  test("appends the enhancement to the accessible label when gold", () => {
    const gold: CardType = { id: 9, rank: "5", suit: "spades", enhancement: "gold" };
    render(<Card card={gold} />);
    expect(screen.getByRole("button")).toHaveAccessibleName("5 of Spades (Gold, +$3 if held at end of round)");
  });

  test("does not append an enhancement suffix to a vanilla card's accessible label", () => {
    render(<Card card={aceOfSpades} />);
    expect(screen.getByRole("button")).toHaveAccessibleName("A of Spades");
  });

  test("shows the gold scoring ring when goldScoring is true", () => {
    const gold: CardType = { id: 9, rank: "5", suit: "spades", enhancement: "gold" };
    render(<Card card={gold} goldScoring />);
    expect(screen.getByRole("button")).toHaveClass("ring-money");
  });

  test("does not show the gold scoring ring when goldScoring is omitted", () => {
    const gold: CardType = { id: 9, rank: "5", suit: "spades", enhancement: "gold" };
    render(<Card card={gold} />);
    expect(screen.getByRole("button")).not.toHaveClass("ring-money");
  });

  test("shows the steel scoring ring when steelScoring is true", () => {
    const steel: CardType = { id: 20, rank: "A", suit: "spades", enhancement: "steel" };
    render(<Card card={steel} steelScoring />);
    expect(screen.getByRole("button")).toHaveClass("ring-muted");
  });

  test("does not show the steel scoring ring when steelScoring is omitted", () => {
    const steel: CardType = { id: 21, rank: "A", suit: "spades", enhancement: "steel" };
    render(<Card card={steel} />);
    expect(screen.getByRole("button")).not.toHaveClass("ring-muted");
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
  ])("exposes data-enhancement for $enhancement", ({ enhancement, card }) => {
    render(<Card card={card} />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "data-enhancement",
      enhancement,
    );
  });

  test.each<{ enhancement: string; accessibleName: string; card: CardType }>([
    { enhancement: "steel", accessibleName: "A of Hearts (Steel, ×1.5 Mult while held in hand)", card: { id: 10, rank: "A", suit: "hearts", enhancement: "steel" } },
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
    render(<Card card={bonus} />);
    expect(screen.getByText("♠")).toBeInTheDocument();
  });

  test("does not render a center value on a non-enhanced card", () => {
    render(<Card card={aceOfSpades} />);
    expect(screen.queryByTestId("card-center-value-1")).not.toBeInTheDocument();
  });

  test("keeps the center suit pip on a non-enhanced card", () => {
    render(<Card card={aceOfSpades} />);
    expect(screen.getAllByText("♠")).toHaveLength(2);
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

  test("renders the enhancement value on an enhanced face card", () => {
    const gold: CardType = { id: 64, rank: "K", suit: "hearts", enhancement: "gold" };
    render(<Card card={gold} />);
    expect(screen.getByTestId("card-center-value-64")).toHaveTextContent("+$3");
  });

  test("a steel card captions its value as held in hand", () => {
    const steel: CardType = { id: 67, rank: "10", suit: "clubs", enhancement: "steel" };
    render(<Card card={steel} />);
    expect(screen.getByTestId("card-center-value-67")).toHaveTextContent("in hand");
  });

  test("a gold card captions its value as if held", () => {
    const gold: CardType = { id: 68, rank: "7", suit: "diamonds", enhancement: "gold" };
    render(<Card card={gold} />);
    expect(screen.getByTestId("card-center-value-68")).toHaveTextContent("if held");
  });

  test("a scoring enhancement shows no held caption (negative)", () => {
    const bonus: CardType = { id: 69, rank: "5", suit: "spades", enhancement: "bonus" };
    render(<Card card={bonus} />);
    expect(screen.getByTestId("card-center-value-69")).not.toHaveTextContent("held");
  });

  test("keeps the face decoration on a wild face card with no display value", () => {
    const wild: CardType = { id: 66, rank: "K", suit: "hearts", enhancement: "wild" };
    render(<Card card={wild} />);
    expect(screen.getByText("♚")).toBeInTheDocument();
  });

  test("keeps the center suit pip on a wild card with no display value", () => {
    const wild: CardType = { id: 65, rank: "3", suit: "hearts", enhancement: "wild" };
    render(<Card card={wild} />);
    expect(screen.getAllByText("♥")).toHaveLength(2);
  });

  test("renders both odds as text in the center of a lucky number card", () => {
    const lucky: CardType = { id: 71, rank: "9", suit: "hearts", enhancement: "lucky" };
    render(<Card card={lucky} />);
    const center = screen.getByTestId("card-center-lucky-71");
    expect(center).not.toHaveTextContent("☘");
    expect(center).toHaveTextContent("1/5 +20");
    expect(center).toHaveTextContent("1/15 +$20");
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

  test("renders the lucky treatment on a lucky face card", () => {
    const lucky: CardType = { id: 74, rank: "Q", suit: "diamonds", enhancement: "lucky" };
    render(<Card card={lucky} />);
    expect(screen.getByTestId("card-center-lucky-74")).toHaveTextContent("1/5 +20");
  });

  test("exposes the stone enhancement via data-enhancement", () => {
    const stone: CardType = { id: 15, rank: "2", suit: "spades", enhancement: "stone" };
    render(<Card card={stone} />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "data-enhancement",
      "stone",
    );
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
    render(<Card card={stone} />);
    expect(screen.queryByText("♠")).not.toBeInTheDocument();
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
  ])("exposes data-seal for the $seal seal", ({ seal, card }) => {
    render(<Card card={card} />);
    expect(screen.getByRole("button")).toHaveAttribute("data-seal", seal);
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
      "K of Diamonds (Gold, +$3 if held at end of round), Red Seal",
    );
  });
});

describe("Card scoring pulse animation", () => {
  test("does not render the scoring pulse overlay when scoring is false", () => {
    const { container } = render(<Card card={aceOfSpades} scoring={false} />);
    expect(container.querySelector(".animate-pulse-flash")).toBeNull();
  });

  test("renders the scoring pulse overlay when scoring is true", () => {
    const { container } = render(<Card card={aceOfSpades} scoring />);
    expect(container.querySelector(".animate-pulse-flash")).not.toBeNull();
  });

  test("remounts the pulse overlay on consecutive ticks (so a Red Seal retrigger restarts the animation)", () => {
    const { container, rerender } = render(
      <Card card={aceOfSpades} scoring scoringPulseTick={3} />,
    );
    const before = container.querySelector(".animate-pulse-flash");
    rerender(<Card card={aceOfSpades} scoring scoringPulseTick={4} />);
    const after = container.querySelector(".animate-pulse-flash");
    expect(after).not.toBe(before);
  });

  test("a non-scoring card renders no pulse overlay regardless of tick", () => {
    const { container } = render(
      <Card card={aceOfSpades} scoring={false} scoringPulseTick={5} />,
    );
    expect(container.querySelector(".animate-pulse-flash")).toBeNull();
  });
});

describe("Card face-down hides seal/enhancement/edition", () => {
  test("a face-down lucky card does not expose its enhancement", () => {
    const lucky: CardType = {
      id: 40,
      rank: "3",
      suit: "hearts",
      enhancement: "lucky",
      faceDown: true,
    };
    render(<Card card={lucky} />);
    expect(screen.getByRole("button")).not.toHaveAttribute("data-enhancement");
  });

  test("a face-down blue-seal card does not expose its seal", () => {
    const sealed: CardType = {
      id: 41,
      rank: "7",
      suit: "clubs",
      seal: "blue",
      faceDown: true,
    };
    render(<Card card={sealed} />);
    expect(screen.getByRole("button")).not.toHaveAttribute("data-seal");
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

  test("a face-down foil card does not expose its edition", () => {
    const editioned: CardType = {
      id: 43,
      rank: "8",
      suit: "diamonds",
      edition: "foil",
      faceDown: true,
    };
    render(<Card card={editioned} />);
    expect(screen.getByRole("button")).not.toHaveAttribute("data-edition");
  });

  test("a face-down card flipped face-up restores its enhancement (regression)", () => {
    const lucky: CardType = {
      id: 44,
      rank: "3",
      suit: "hearts",
      enhancement: "lucky",
      faceDown: false,
    };
    render(<Card card={lucky} />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "data-enhancement",
      "lucky",
    );
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

  test("a face-down card scoring exposes its enhancement (showBack flips off during scoring)", () => {
    const lucky: CardType = {
      id: 46,
      rank: "3",
      suit: "hearts",
      enhancement: "lucky",
      faceDown: true,
    };
    render(<Card card={lucky} scoring />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "data-enhancement",
      "lucky",
    );
  });
});

describe("Card accessible-name vs visible-text", () => {
  test("top corner visible glyphs are aria-hidden so they do not duplicate the aria-label", () => {
    render(<Card card={aceOfSpades} />);
    expect(screen.getByText("A").parentElement).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  test("the button's accessible name still comes from the aria-label", () => {
    render(<Card card={aceOfSpades} />);
    expect(screen.getByRole("button")).toHaveAccessibleName("A of Spades");
  });
});

describe("Card — forced (Cerulean Bell)", () => {
  test("marks the card with data-forced when forced", () => {
    render(<Card card={aceOfSpades} forced />);
    expect(screen.getByRole("button")).toHaveAttribute("data-forced");
  });

  test("renders the forced lock badge when forced", () => {
    render(<Card card={aceOfSpades} forced />);
    expect(screen.getByTestId("card-forced-1")).toBeInTheDocument();
  });

  test("notes the forced state in the accessible label", () => {
    render(<Card card={aceOfSpades} forced />);
    expect(
      screen.getByRole("button", { name: /forced selection/i }),
    ).toBeInTheDocument();
  });

  test("renders no forced badge when not forced (negative)", () => {
    render(<Card card={aceOfSpades} />);
    expect(screen.queryByTestId("card-forced-1")).not.toBeInTheDocument();
  });
});

describe("Card memoization", () => {
  beforeEach(() => {
    useTranslationCalls.count = 0;
  });

  test("skips re-render when props are unchanged and an unrelated ancestor re-renders", async () => {
    render(<CardMemoHarness />);
    const rendersAfterMount = useTranslationCalls.count;
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "bump" }));
    await user.click(screen.getByRole("button", { name: "bump" }));
    expect(useTranslationCalls.count).toBe(rendersAfterMount);
  });
});
