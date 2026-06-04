import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { forceShopLayout, shopPickerRngConfig } from "./items/shop";
import { useGame } from "./store/game";
import {
  dismissBlindSelect,
  flushDiscardAnimation,
  getHandCardButtons,
  mockDeckConfig,
  mockShuffleConfig,
  setupAppTestEnvironment,
} from "./App.test-helpers";

vi.mock("./components/system/sounds", () => ({ play: vi.fn() }));

vi.mock("./cards/deck", async () => {
  const actual = await vi.importActual<typeof import("./cards/deck")>("./cards/deck");
  return {
    ...actual,
    shuffle: <T,>(items: ReadonlyArray<T>): T[] => {
      if (mockShuffleConfig.useReverse) return items.slice().reverse();
      return mockShuffleConfig.useIdentity ? items.slice() : actual.shuffle(items);
    },
    createDeck: (excluded?: ReadonlySet<string>) => {
      const deck = actual.createDeck(excluded);
      if (!mockDeckConfig.useDefaultEnhancements) return deck;
      return deck.map((c) => ({
        ...c,
        enhancement: actual.defaultEnhancementForRank(c.rank),
      }));
    },
  };
});

setupAppTestEnvironment();

async function openPoolPack(
  user: ReturnType<typeof userEvent.setup>,
  pool: string,
): Promise<void> {
  const offer = document.querySelector(
    `[data-offer-kind="pack"][data-pack-pool="${pool}"]`,
  );
  if (!offer) throw new Error(`no ${pool} pack offer in shop`);
  const open = offer.querySelector("button.shop-offer-buy") as HTMLButtonElement;
  await user.click(open);
  await screen.findByTestId("pack-open-close");
}

describe("Spectral packs show a preview hand (#401)", () => {
  test("opening a forced Spectral pack renders a preview hand", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    useGame.getState().setPendingForcedPacks((prev) => [...prev, "spectral"]);
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(await screen.findByRole("button", { name: /Continue/ }));
    await openPoolPack(user, "spectral");
    expect(screen.getByTestId("pack-open-preview-hand")).toBeInTheDocument();
  });
});

describe("Applying owned enhancement tarots to the preview hand (#401)", () => {
  async function reachArcanaPreviewWithTarot(): Promise<{
    user: ReturnType<typeof userEvent.setup>;
    tarotName: string | null;
  }> {
    mockShuffleConfig.useIdentity = true;
    shopPickerRngConfig.rng = forceShopLayout(["tarot", "joker"]);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add \$10/));
    await dismissBlindSelect(user);
    useGame.getState().setPendingForcedPacks((prev) => [...prev, "arcana"]);
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(await screen.findByRole("button", { name: /Continue/ }));
    const tarotOffer = document.querySelector('[data-offer-kind="tarot"]');
    if (!tarotOffer) throw new Error("no tarot offer in shop");
    const tarotName =
      tarotOffer.querySelector(".shop-offer-name")?.textContent ?? null;
    const buy = tarotOffer.querySelector(
      "button.shop-offer-buy",
    ) as HTMLButtonElement;
    await user.click(buy);
    await openPoolPack(user, "arcana");
    return { user, tarotName };
  }

  function firstPreviewCard(): HTMLElement {
    const hand = screen.getByTestId("pack-open-preview-hand");
    const btn = hand.querySelector("button[aria-pressed]");
    if (!btn) throw new Error("no preview card button");
    return btn as HTMLElement;
  }

  test("the offered tarot is an apply-enhancement tarot (deterministic setup)", async () => {
    const { tarotName } = await reachArcanaPreviewWithTarot();
    expect(tarotName).toBe("The Magician");
  });

  test("owned enhancement tarot is use-disabled with no preview selection", async () => {
    await reachArcanaPreviewWithTarot();
    expect(screen.getByTestId("consumable-tile-filled-0")).toHaveAttribute(
      "data-use-disabled",
      "true",
    );
  });

  test("selecting a preview card then clicking the tarot empties the slot", async () => {
    const { user } = await reachArcanaPreviewWithTarot();
    await user.click(firstPreviewCard());
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    expect(
      screen.queryByTestId("consumable-tile-filled-0"),
    ).not.toBeInTheDocument();
  });

  test("applying an owned tarot to the preview does not close the pack-pick", async () => {
    const { user } = await reachArcanaPreviewWithTarot();
    await user.click(firstPreviewCard());
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    expect(screen.getByTestId("pack-open-subtitle")).toBeInTheDocument();
  });

  test("the targeted preview card shows the enhancement after applying the tarot", async () => {
    const { user } = await reachArcanaPreviewWithTarot();
    const card = firstPreviewCard();
    await user.click(card);
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    const enhanced = screen
      .getByTestId("pack-open-preview-hand")
      .querySelector(".card-enhancement-lucky");
    expect(enhanced).not.toBeNull();
  });

  test("negative: clicking the owned tarot with no preview selection keeps the slot filled", async () => {
    const { user } = await reachArcanaPreviewWithTarot();
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    expect(screen.getByTestId("consumable-tile-filled-0")).toBeInTheDocument();
  });
});
