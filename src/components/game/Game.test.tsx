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
    jokerCapacity: 5,
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

  describe("in-hand deck pile filters destroyedCardIds (closes #803)", () => {
    test("baseline count reflects dealt.remaining when no ids are destroyed", () => {
      const base = makeCards(1, 40);
      useGame.setState({
        baseDeckCards: base,
        dealt: { hand: [], remaining: makeCards(1, 10) },
      });
      renderGame();
      expect(deckPileCount()).toBe(10);
    });

    test("count drops synchronously when destroyedCardIds grows mid-round", () => {
      const base = makeCards(1, 40);
      useGame.setState({
        baseDeckCards: base,
        dealt: { hand: [], remaining: makeCards(1, 10) },
      });
      const { rerender } = render(
        <Game
          onSubmitHand={vi.fn()}
          onDiscard={vi.fn()}
          canDiscard={true}
          onCardDiscardEnd={vi.fn()}
        />,
      );
      expect(deckPileCount()).toBe(10);
      useGame.setState({ destroyedCardIds: new Set([1, 2]) });
      rerender(
        <Game
          onSubmitHand={vi.fn()}
          onDiscard={vi.fn()}
          canDiscard={true}
          onCardDiscardEnd={vi.fn()}
        />,
      );
      expect(deckPileCount()).toBe(8);
    });

    test("Remaining Cards modal omits destroyed cards' [data-card-id]", async () => {
      const user = userEvent.setup();
      useGame.setState({
        baseDeckCards: makeCards(1, 40),
        dealt: { hand: [], remaining: makeCards(1, 5) },
        destroyedCardIds: new Set([2]),
      });
      renderGame();
      await user.click(screen.getByLabelText(/^Deck \(4 cards remaining\)$/));
      expect(
        document.querySelector('.deck-modal [data-card-id="2"]'),
      ).toBeNull();
    });

    test("does not drop ids that are not in destroyedCardIds (negative)", () => {
      useGame.setState({
        baseDeckCards: makeCards(1, 40),
        dealt: { hand: [], remaining: makeCards(1, 10) },
        destroyedCardIds: new Set([999]),
      });
      renderGame();
      expect(deckPileCount()).toBe(10);
    });

    test("count delta equals -N after destroyedCardIds gains N overlapping ids", () => {
      useGame.setState({
        baseDeckCards: makeCards(1, 40),
        dealt: { hand: [], remaining: makeCards(1, 10) },
      });
      const { rerender } = render(
        <Game
          onSubmitHand={vi.fn()}
          onDiscard={vi.fn()}
          canDiscard={true}
          onCardDiscardEnd={vi.fn()}
        />,
      );
      const before = deckPileCount();
      useGame.setState({ destroyedCardIds: new Set([3, 4, 5]) });
      rerender(
        <Game
          onSubmitHand={vi.fn()}
          onDiscard={vi.fn()}
          canDiscard={true}
          onCardDiscardEnd={vi.fn()}
        />,
      );
      expect(deckPileCount()).toBe(before - 3);
    });
  });
});

describe("Submit Hand button — inline current hand readout (#745)", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("does not render the inline readout when no hand is selected (negative)", () => {
    renderGame();
    expect(screen.queryByTestId("submit-hand-detected")).not.toBeInTheDocument();
  });

  test("renders the inline readout with the hand label when a hand is selected", () => {
    useGame.getState().setSelectedHand({ label: "Pair", chips: 10, multiplier: 2 });
    useGame.getState().setChips(10);
    useGame.getState().setMultiplier(2);
    renderGame();
    expect(screen.getByTestId("submit-hand-detected")).toHaveTextContent(/Pair/);
  });

  test("renders the inline readout with the chips × multiplier from the store", () => {
    useGame.getState().setSelectedHand({ label: "Flush", chips: 35, multiplier: 4 });
    useGame.getState().setChips(35);
    useGame.getState().setMultiplier(4);
    renderGame();
    expect(screen.getByTestId("submit-hand-detected")).toHaveTextContent(/35.*×.*4/);
  });

  test("inline readout applies the dev chips/mult offsets so it matches the sidebar", () => {
    useGame.getState().setSelectedHand({ label: "Pair", chips: 10, multiplier: 2 });
    useGame.getState().setChips(10);
    useGame.getState().setMultiplier(2);
    useGame.getState().setDevChipsBonus(5);
    useGame.getState().setDevMultBonus(1);
    renderGame();
    expect(screen.getByTestId("submit-hand-detected")).toHaveTextContent(/15.*×.*3/);
  });

  test("Submit Hand accessible name includes the hand label when one is selected", () => {
    useGame.getState().setSelectedHand({ label: "Pair", chips: 10, multiplier: 2 });
    useGame.getState().setChips(10);
    useGame.getState().setMultiplier(2);
    renderGame();
    expect(
      screen.getByRole("button", { name: /Submit Hand: Pair/ }),
    ).toBeInTheDocument();
  });
});
