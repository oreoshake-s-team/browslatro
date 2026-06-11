import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { HANDS } from "./constants";
import { shopPickerRngConfig } from "./items/shop";
import { createPlanetCatalog } from "./items/planets";
import { useGame } from "./store/game";
import type { PackOffer } from "./items/packs";
import {
  flushDiscardAnimation,
  getHandCardButtons,
  getStatValue,
  mockDeckConfig,
  mockShuffleConfig,
  setupAppTestEnvironment,
} from "./App.test-helpers";


vi.mock("./cards/deck", async () => {
  const actual = await vi.importActual<typeof import("./cards/deck")>("./cards/deck");
  return {
    ...actual,
    shuffle: <T,>(items: ReadonlyArray<T>): T[] => {
      if (mockShuffleConfig.useReverse) return items.slice().reverse();
      return mockShuffleConfig.useIdentity ? items.slice() : actual.shuffle(items);
    },
    createDeck: () => {
      const deck = actual.createDeck();
      if (!mockDeckConfig.useDefaultEnhancements) return deck;
      return deck.map((c) => ({
        ...c,
        enhancement: actual.defaultEnhancementForRank(c.rank),
      }));
    },
  };
});

setupAppTestEnvironment();

describe("Celestial pack open + pick integration", () => {
  async function openShopWithMoney(): Promise<ReturnType<typeof userEvent.setup>> {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add \$10/));
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(await screen.findByRole("button", { name: /Continue/ }));
    await screen.findByTestId("shop-money");
    return user;
  }

  function findPackOfferIdx(): number {
    const all = screen.getAllByTestId(/^shop-offer-/);
    for (let i = 0; i < all.length; i += 1) {
      if (all[i].getAttribute("data-offer-kind") === "pack") return i;
    }
    throw new Error("no pack offer in shop");
  }

  function moneyOf(): number {
    return Number(
      getStatValue("Money").textContent?.replace(/[^0-9-]/g, "") ?? "0",
    );
  }

  test("clicking Open on a pack offer opens the pack modal, deducts the price from money, and marks the offer Sold after the modal closes", async () => {
    const user = await openShopWithMoney();
    const before = moneyOf();
    const idx = findPackOfferIdx();
    const offer = screen.getByTestId(`shop-offer-${idx}`);
    const priceText = offer.querySelector(".shop-offer-price")?.textContent ?? "";
    const price = Number(priceText.replace(/[^0-9]/g, ""));
    const open = offer.querySelector("button.shop-offer-buy") as HTMLButtonElement;
    await user.click(open);
    await screen.findByTestId("pack-open-close");
    expect(screen.getByTestId("pack-open-subtitle")).toBeInTheDocument();
    expect(moneyOf()).toBe(before - price);
    await user.click(screen.getByTestId("pack-open-close"));
    expect(
      screen
        .getByTestId(`shop-offer-${idx}`)
        .querySelector("button.shop-offer-buy"),
    ).toHaveTextContent("Sold");
  });

  test("picking a planet from a Celestial pack auto-applies it (no consumable added) and upgrades the matching hand's level", async () => {
    shopPickerRngConfig.rng = () => 0.45;
    const user = await openShopWithMoney();
    const consumablesBefore = screen.queryAllByTestId(
      /^consumable-tile-filled-/,
    ).length;
    const idx = findPackOfferIdx();
    const open = screen
      .getByTestId(`shop-offer-${idx}`)
      .querySelector("button.shop-offer-buy") as HTMLButtonElement;
    await user.click(open);
    await screen.findByTestId("pack-open-close");
    await user.click(screen.getByTestId("pack-open-pick-0"));
    expect(screen.queryAllByTestId(/^consumable-tile-filled-/)).toHaveLength(
      consumablesBefore,
    );
    await user.click(screen.getByRole("button", { name: "Run info" }));
    await screen.findByRole("dialog", { name: "Run Information" });
    const levels = HANDS.map((h) =>
      Number(
        screen.getByTestId(`run-info-level-${h.label}`).textContent ?? "1",
      ),
    );
    expect(levels.some((lvl) => lvl > 1)).toBe(true);
  });

  test("picking the only allowed card closes the modal automatically", async () => {
    shopPickerRngConfig.rng = () => 0.5;
    const user = await openShopWithMoney();
    const idx = findPackOfferIdx();
    const open = screen
      .getByTestId(`shop-offer-${idx}`)
      .querySelector("button.shop-offer-buy") as HTMLButtonElement;
    await user.click(open);
    await screen.findByTestId("pack-open-close");
    await user.click(screen.getByTestId("pack-open-pick-0"));
    expect(screen.queryByTestId("pack-open-subtitle")).not.toBeInTheDocument();
  });

  test("closing the modal without picking still leaves the pack Sold (player paid)", async () => {
    const user = await openShopWithMoney();
    const idx = findPackOfferIdx();
    const open = screen
      .getByTestId(`shop-offer-${idx}`)
      .querySelector("button.shop-offer-buy") as HTMLButtonElement;
    await user.click(open);
    await screen.findByTestId("pack-open-close");
    await user.click(screen.getByTestId("pack-open-close"));
    expect(
      screen
        .getByTestId(`shop-offer-${idx}`)
        .querySelector("button.shop-offer-buy"),
    ).toHaveTextContent("Sold");
  });
});

describe("Mega pack — picked option is removed from list", () => {
  function megaCelestialPack(): PackOffer {
    const planets = createPlanetCatalog().slice(0, 5);
    return {
      pool: "celestial",
      variant: "mega",
      options: planets.map((planet) => ({ kind: "planet" as const, planet })),
    };
  }

  function openMegaCelestialPack(): ReturnType<typeof userEvent.setup> {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    act(() => useGame.getState().openPackOffer(megaCelestialPack()));
    return user;
  }

  test("after picking option 0, option-0 pick button is gone, other pick buttons stay, and picks-remaining counter shows 1 left", async () => {
    const user = openMegaCelestialPack();
    await screen.findByTestId("pack-open-pick-0");
    await user.click(screen.getByTestId("pack-open-pick-0"));
    expect(screen.queryByTestId("pack-open-pick-0")).not.toBeInTheDocument();
    expect(screen.getByTestId("pack-open-pick-1")).toBeInTheDocument();
    expect(screen.getByTestId("pack-open-subtitle")).toHaveTextContent(
      /1 left/,
    );
  });

  test("picking both options closes the modal", async () => {
    const user = openMegaCelestialPack();
    await screen.findByTestId("pack-open-pick-0");
    await user.click(screen.getByTestId("pack-open-pick-0"));
    await user.click(screen.getByTestId("pack-open-pick-1"));
    expect(screen.queryByTestId("pack-open-subtitle")).not.toBeInTheDocument();
  });

  test("opening a fresh Mega pack resets the picked indices (next pack shows all options)", async () => {
    const user = openMegaCelestialPack();
    await screen.findByTestId("pack-open-pick-0");
    await user.click(screen.getByTestId("pack-open-pick-0"));
    await user.click(screen.getByTestId("pack-open-pick-1"));
    act(() => useGame.getState().openPackOffer(megaCelestialPack()));
    await screen.findByTestId("pack-open-pick-0");
    expect(screen.getByTestId("pack-open-pick-0")).toBeInTheDocument();
  });
});

