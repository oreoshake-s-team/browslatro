import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach } from "vitest";
import Game from "./Game";
import GameSessionProvider from "./GameSessionProvider";
import { useGame } from "../../store/game";
import { usePreferences } from "../system/preferences";
import type { Card } from "../../cards/types";
import type { PackOffer } from "../../items/packs";
import type { Consumable } from "../../items/consumables";
import { createJokerCatalog } from "../../items/jokers";
import { createPlanetCatalog } from "../../items/planets";
import { createTarotCatalog } from "../../items/tarots";
import { createSpectralCatalog } from "../../items/spectrals";

function renderGame() {
  return render(
    <GameSessionProvider>
      <Game />
    </GameSessionProvider>,
  );
}

function seedShop(): void {
  useGame.getState().setShopOffers([]);
  useGame.getState().setCurrentAnteVouchers([]);
}

function makeCards(start: number, count: number): Card[] {
  return Array.from({ length: count }, (_, i) => ({
    id: start + i,
    rank: "5" as const,
    suit: "spades" as const,
  }));
}

const JOKERS = createJokerCatalog();
const PLANETS = createPlanetCatalog();
const TAROTS = createTarotCatalog();
const SPECTRALS = createSpectralCatalog();

const tarotConsumable: Consumable = { kind: "tarot", card: TAROTS[0] };
const spectralConsumable: Consumable = { kind: "spectral", card: SPECTRALS[0] };
const planetConsumable: Consumable = { kind: "planet", card: PLANETS[0] };

const standardPack: PackOffer = {
  pool: "standard",
  variant: "normal",
  options: [{ kind: "playing-card", card: { id: 9001, rank: "A", suit: "spades" } }],
};
const buffoonPack: PackOffer = {
  pool: "buffoon",
  variant: "normal",
  options: [{ kind: "joker", joker: JOKERS[0] }],
};
const celestialPack: PackOffer = {
  pool: "celestial",
  variant: "normal",
  options: [{ kind: "planet", planet: PLANETS[0] }],
};
const arcanaPack: PackOffer = {
  pool: "arcana",
  variant: "normal",
  options: [{ kind: "tarot", tarot: TAROTS[0] }],
};

function seedPackOpen(pack: PackOffer, previewHand: Card[] = []): void {
  useGame.getState().setOpenedPack(pack);
  useGame.getState().setPackPicksRemaining(1);
  useGame.getState().setPackPreviewHand(previewHand);
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

  test("submitting a selected hand marks the game region busy", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      useGame.getState().setDealt({ hand: makeCards(1, 8), remaining: [] });
      useGame.getState().setSelectedIds(new Set([1, 2]));
      renderGame();
      await user.click(screen.getByText(/Submit Hand/));
      expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
      for (let i = 0; i < 60 && vi.getTimerCount() > 0; i += 1) {
        act(() => {
          vi.runOnlyPendingTimers();
        });
      }
    } finally {
      vi.useRealTimers();
    }
  });

  test("Submit Hand button is disabled when no cards are selected", () => {
    useGame.getState().setSelectedIds(new Set());
    renderGame();
    expect(screen.getByRole("button", { name: /Submit Hand/ })).toBeDisabled();
  });

  test("Submit Hand button is enabled when at least one card is selected", () => {
    useGame.getState().setSelectedIds(new Set([1]));
    renderGame();
    expect(
      screen.getByRole("button", { name: /Submit Hand/ }),
    ).not.toBeDisabled();
  });

  test("the game region is not busy before a hand is submitted (negative)", () => {
    renderGame();
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "false");
  });

  test("renders the player's hand of cards", () => {
    renderGame();
    expect(screen.getByTestId("hand-cards")).toBeInTheDocument();
  });

  test.each([
    ["standard", standardPack],
    ["buffoon", buffoonPack],
    ["celestial", celestialPack],
  ] as const)(
    "hides the player hand during a %s pack pick when no usable consumable is held",
    async (_pool, pack) => {
      seedPackOpen(pack);
      renderGame();
      await screen.findByTestId("pack-open-subtitle");
      expect(screen.queryByTestId("hand-cards")).not.toBeInTheDocument();
    },
  );

  test("hides the deck drop target during a standard pack pick when no usable consumable is held", async () => {
    seedPackOpen(standardPack);
    renderGame();
    await screen.findByTestId("pack-open-subtitle");
    expect(screen.queryByTestId("deck-pile")).not.toBeInTheDocument();
  });

  test("hides the player hand during a standard pack pick when only a planet is held", async () => {
    useGame.getState().setConsumables([planetConsumable]);
    seedPackOpen(standardPack);
    renderGame();
    await screen.findByTestId("pack-open-subtitle");
    expect(screen.queryByTestId("hand-cards")).not.toBeInTheDocument();
  });

  test("hides the player hand during a standard pack pick even when a tarot is held", async () => {
    useGame.getState().setConsumables([tarotConsumable]);
    seedPackOpen(standardPack);
    renderGame();
    await screen.findByTestId("pack-open-subtitle");
    expect(screen.queryByTestId("hand-cards")).not.toBeInTheDocument();
  });

  test("hides the player hand during a buffoon pack pick even when a spectral is held", async () => {
    useGame.getState().setConsumables([spectralConsumable]);
    seedPackOpen(buffoonPack);
    renderGame();
    await screen.findByTestId("pack-open-subtitle");
    expect(screen.queryByTestId("hand-cards")).not.toBeInTheDocument();
  });

  test("hides the player hand during a celestial pack pick even when a tarot is held", async () => {
    useGame.getState().setConsumables([tarotConsumable]);
    seedPackOpen(celestialPack);
    renderGame();
    await screen.findByTestId("pack-open-subtitle");
    expect(screen.queryByTestId("hand-cards")).not.toBeInTheDocument();
  });

  test("keeps joker sell buttons visible during a buffoon pack pick", async () => {
    useGame.getState().setJokers([createJokerCatalog()[0]]);
    seedPackOpen(buffoonPack);
    renderGame();
    await screen.findByTestId("pack-open-subtitle");
    expect(screen.getByTestId("jokers-tray")).toHaveClass("jokers--sell-visible");
  });

  test("does not force joker sell buttons visible during a celestial pack pick (negative)", async () => {
    useGame.getState().setJokers([createJokerCatalog()[0]]);
    seedPackOpen(celestialPack);
    renderGame();
    await screen.findByTestId("pack-open-subtitle");
    expect(screen.getByTestId("jokers-tray")).not.toHaveClass(
      "jokers--sell-visible",
    );
  });

  test.each([
    ["buffoon", buffoonPack],
    ["celestial", celestialPack],
    ["standard", standardPack],
  ] as const)(
    "hides the deck pile during a %s pack pick even when a tarot is held",
    async (_pool, pack) => {
      useGame.getState().setConsumables([tarotConsumable]);
      seedPackOpen(pack);
      renderGame();
      await screen.findByTestId("pack-open-subtitle");
      expect(screen.queryByTestId("deck-pile")).not.toBeInTheDocument();
    },
  );

  test("shows the deck pile during an arcana pack pick when no usable consumable is held", async () => {
    seedPackOpen(arcanaPack);
    renderGame();
    await screen.findByTestId("pack-open-subtitle");
    expect(screen.getByTestId("deck-pile")).toBeInTheDocument();
  });

  test("renders the preview hand during an arcana pack pick", async () => {
    seedPackOpen(arcanaPack, makeCards(1, 3));
    renderGame();
    expect(
      await screen.findByTestId("pack-open-preview-hand"),
    ).toBeInTheDocument();
  });

  test("does not render the live player hand during an arcana pack pick even when a tarot is held", async () => {
    useGame.getState().setConsumables([tarotConsumable]);
    seedPackOpen(arcanaPack, makeCards(1, 3));
    renderGame();
    await screen.findByTestId("pack-open-preview-hand");
    expect(screen.queryByTestId("hand-cards")).not.toBeInTheDocument();
  });

  test("clicking Discard starts discarding the selected cards", async () => {
    const user = userEvent.setup();
    useGame.getState().setDealt({ hand: makeCards(1, 8), remaining: [] });
    useGame.getState().setSelectedIds(new Set([1, 2]));
    renderGame();
    await user.click(screen.getByText(/Discard/));
    expect(useGame.getState().discardingIds).toEqual(new Set([1, 2]));
  });

  test("Discard button is disabled when no cards are selected (negative)", () => {
    useGame.getState().setSelectedIds(new Set());
    renderGame();
    expect(screen.getByText(/Discard/)).toBeDisabled();
  });

  test("Discard button is disabled when no discards remain (negative)", () => {
    useGame.getState().setSelectedIds(new Set([1]));
    useGame.getState().setRemainingDiscards(0);
    renderGame();
    expect(screen.getByText(/Discard/)).toBeDisabled();
  });

  test("Discard button is enabled when cards are selected and discards remain", () => {
    useGame.getState().setSelectedIds(new Set([1]));
    renderGame();
    expect(screen.getByText(/Discard/)).not.toBeDisabled();
  });

  test("Discard button uses the neutral secondary variant", () => {
    renderGame();
    expect(screen.getByText(/Discard/)).toHaveClass("btn--secondary");
  });

  test("Discard button does not use the destructive danger variant", () => {
    renderGame();
    expect(screen.getByText(/Discard/)).not.toHaveClass("btn--danger");
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

  test("Submit Hand renders before Apply modifiers in DOM order", () => {
    renderGame();
    const submit = screen.getByText(/Submit Hand/);
    const modifiers = screen.getByText(/Apply modifiers/);
    const position = submit.compareDocumentPosition(modifiers);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  test("hides the modifier panel when admin mode is off (negative)", () => {
    usePreferences.setState({ adminMode: false });
    renderGame();
    expect(screen.queryByText(/Apply modifiers/)).not.toBeInTheDocument();
  });

  describe("shop overlay deck pile", () => {
    test("reflects current baseDeckCards count, ignoring stale dealt.remaining", () => {
      const base = makeCards(1, 40);
      useGame.setState({
        baseDeckCards: base,
        dealt: { hand: [], remaining: makeCards(1000, 4) },
      });
      seedShop();
      renderGame();
      expect(deckPileCount()).toBe(40);
    });

    test("decreases synchronously when destroyedCardIds grows (e.g. Hanged Man)", () => {
      const base = makeCards(1, 40);
      useGame.setState({
        baseDeckCards: base,
        dealt: { hand: [], remaining: [] },
      });
      seedShop();
      renderGame();
      expect(deckPileCount()).toBe(40);
      act(() => {
        useGame.setState({ destroyedCardIds: new Set([1, 2, 3]) });
      });
      expect(deckPileCount()).toBe(37);
    });

    test("increases synchronously when addedCards grows (e.g. picking from a Standard pack)", () => {
      const base = makeCards(1, 40);
      useGame.setState({
        baseDeckCards: base,
        dealt: { hand: [], remaining: [] },
      });
      seedShop();
      renderGame();
      expect(deckPileCount()).toBe(40);
      act(() => {
        useGame.setState({ addedCards: makeCards(500, 2) });
      });
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
      seedShop();
      renderGame();
      await user.click(screen.getByLabelText(/^Deck \(1 cards remaining\)$/));
      expect(
        document.querySelector(".deck-modal .card--enhancement-gold"),
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

  describe("in-hand deck pile filters destroyedCardIds", () => {
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
      renderGame();
      expect(deckPileCount()).toBe(10);
      act(() => {
        useGame.setState({ destroyedCardIds: new Set([1, 2]) });
      });
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
      renderGame();
      const before = deckPileCount();
      act(() => {
        useGame.setState({ destroyedCardIds: new Set([3, 4, 5]) });
      });
      expect(deckPileCount()).toBe(before - 3);
    });
  });
});

describe("Submit Hand button — inline current hand readout", () => {
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
