import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach } from "vitest";
import Game from "./Game";
import { useGame } from "../../store/game";
import type { ShopProps } from "../shop/Shop";
import type { Card } from "../../cards/types";

function renderGame(overrides: Partial<ComponentProps<typeof Game>> = {}) {
  return render(
    <Game
      onSubmitHand={vi.fn()}
      onDiscard={vi.fn()}
      canDiscard={true}
      onCardDiscardEnd={vi.fn()}
      {...overrides}
    />,
  );
}

function makeShopProps(): ShopProps {
  return {
    money: 0,
    equippedJokerCount: 0,
    consumableCount: 0,
    consumableCapacity: 2,
    offers: [],
    vouchers: [],
    soldVoucherIds: new Set(),
    ownedVoucherIds: new Set(),
    onBuy: vi.fn(),
    onBuyVoucher: vi.fn(),
    onReroll: vi.fn(),
    onNext: vi.fn(),
  };
}

function makeCards(start: number, count: number): Card[] {
  return Array.from({ length: count }, (_, i) => ({
    id: start + i,
    rank: "5" as const,
    suit: "spades" as const,
  }));
}

function deckPileCount(): number {
  const button = screen.getByLabelText(/^Deck \(\d+ cards remaining\)$/);
  const match = button.getAttribute("aria-label")?.match(/Deck \((\d+) cards remaining\)/);
  return match ? Number(match[1]) : -1;
}

describe("Game", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("Submit Hand button calls onSubmitHand", async () => {
    const user = userEvent.setup();
    const onSubmitHand = vi.fn();
    renderGame({ onSubmitHand });
    await user.click(screen.getByText(/Submit Hand/));
    expect(onSubmitHand).toHaveBeenCalledTimes(1);
  });

  test("renders the player's hand of cards", () => {
    renderGame();
    expect(screen.getByLabelText("Your hand")).toBeInTheDocument();
  });

  test("Discard button calls onDiscard when enabled", async () => {
    const user = userEvent.setup();
    const onDiscard = vi.fn();
    renderGame({ onDiscard, canDiscard: true });
    await user.click(screen.getByText(/Discard/));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  test("Discard button is disabled when canDiscard is false", () => {
    renderGame({ canDiscard: false });
    expect(screen.getByText(/Discard/)).toBeDisabled();
  });

  test("Discard button is enabled when canDiscard is true", () => {
    renderGame({ canDiscard: true });
    expect(screen.getByText(/Discard/)).not.toBeDisabled();
  });

  test("the modifier disclosure is closed on first render", () => {
    renderGame();
    expect(screen.getByText(/Apply modifiers/).closest("details")).not.toHaveAttribute(
      "open",
    );
  });

  test("clicking the modifier disclosure opens it", async () => {
    const user = userEvent.setup();
    renderGame();
    await user.click(screen.getByText(/Apply modifiers/));
    expect(screen.getByText(/Apply modifiers/).closest("details")).toHaveAttribute(
      "open",
    );
  });

  test("does not render a Current hand readout (negative)", () => {
    renderGame();
    expect(screen.queryByText(/Current hand/i)).not.toBeInTheDocument();
  });

  test("does not render a Play or discard step label (negative)", () => {
    renderGame();
    expect(screen.queryByText(/Play or discard/i)).not.toBeInTheDocument();
  });

  test("Submit Hand renders before Apply modifiers in DOM order (closes #634)", () => {
    renderGame();
    const submit = screen.getByText(/Submit Hand/);
    const modifiers = screen.getByText(/Apply modifiers/);
    const position = submit.compareDocumentPosition(modifiers);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  describe("shop overlay deck pile (closes #747)", () => {
    test("reflects current baseDeckCards count, ignoring stale dealt.remaining", () => {
      const base = makeCards(1, 40);
      useGame.setState({
        baseDeckCards: base,
        dealt: { hand: [], remaining: makeCards(1000, 4) },
      });
      renderGame({ shop: makeShopProps() });
      expect(deckPileCount()).toBe(40);
    });

    test("decreases synchronously when destroyedCardIds grows (e.g. Hanged Man)", () => {
      const base = makeCards(1, 40);
      useGame.setState({
        baseDeckCards: base,
        dealt: { hand: [], remaining: [] },
      });
      const { rerender } = render(
        <Game
          onSubmitHand={vi.fn()}
          onDiscard={vi.fn()}
          canDiscard={true}
          onCardDiscardEnd={vi.fn()}
          shop={makeShopProps()}
        />,
      );
      expect(deckPileCount()).toBe(40);
      useGame.setState({ destroyedCardIds: new Set([1, 2, 3]) });
      rerender(
        <Game
          onSubmitHand={vi.fn()}
          onDiscard={vi.fn()}
          canDiscard={true}
          onCardDiscardEnd={vi.fn()}
          shop={makeShopProps()}
        />,
      );
      expect(deckPileCount()).toBe(37);
    });

    test("increases synchronously when addedCards grows (e.g. picking from a Standard pack)", () => {
      const base = makeCards(1, 40);
      useGame.setState({
        baseDeckCards: base,
        dealt: { hand: [], remaining: [] },
      });
      const { rerender } = render(
        <Game
          onSubmitHand={vi.fn()}
          onDiscard={vi.fn()}
          canDiscard={true}
          onCardDiscardEnd={vi.fn()}
          shop={makeShopProps()}
        />,
      );
      expect(deckPileCount()).toBe(40);
      useGame.setState({ addedCards: makeCards(500, 2) });
      rerender(
        <Game
          onSubmitHand={vi.fn()}
          onDiscard={vi.fn()}
          canDiscard={true}
          onCardDiscardEnd={vi.fn()}
          shop={makeShopProps()}
        />,
      );
      expect(deckPileCount()).toBe(42);
    });

    test("modal listing reflects enhancement overrides applied after deal (e.g. Sigil/Strength)", async () => {
      const user = userEvent.setup();
      const base = makeCards(1, 1);
      useGame.setState({
        baseDeckCards: base,
        dealt: { hand: [], remaining: [] },
        cardEnhancementsById: new Map([[1, "gold"]]),
      });
      renderGame({ shop: makeShopProps() });
      await user.click(screen.getByLabelText(/^Deck \(1 cards remaining\)$/));
      expect(
        document.querySelector(".deck-modal .card-enhancement-gold"),
      ).not.toBeNull();
    });

    test("in-hand deck pile (no shop/pack) still shows dealt.remaining, not full deck", () => {
      const base = makeCards(1, 40);
      useGame.setState({
        baseDeckCards: base,
        dealt: { hand: [], remaining: makeCards(2000, 7) },
      });
      renderGame();
      expect(deckPileCount()).toBe(7);
    });
  });
});
