import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { HANDS } from "./constants";
import { shopPickerRngConfig } from "./items/shop";
import {
  flushDiscardAnimation,
  getHandCardButtons,
  getStatValue,
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
    await user.click(screen.getByRole("button", { name: /Continue/ }));
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

  test("clicking Open on a pack offer opens the pack modal", async () => {
    const user = await openShopWithMoney();
    const idx = findPackOfferIdx();
    const open = screen
      .getByTestId(`shop-offer-${idx}`)
      .querySelector("button.shop-offer-buy") as HTMLButtonElement;
    await user.click(open);
    expect(screen.getByTestId("pack-open-subtitle")).toBeInTheDocument();
  });

  test("opening a pack deducts the pack price from money", async () => {
    const user = await openShopWithMoney();
    const before = moneyOf();
    const idx = findPackOfferIdx();
    const offer = screen.getByTestId(`shop-offer-${idx}`);
    const priceText = offer.querySelector(".shop-offer-price")?.textContent ?? "";
    const price = Number(priceText.replace(/[^0-9]/g, ""));
    const open = offer.querySelector("button.shop-offer-buy") as HTMLButtonElement;
    await user.click(open);
    expect(moneyOf()).toBe(before - price);
  });

  test("opening a pack marks the pack offer as Sold", async () => {
    const user = await openShopWithMoney();
    const idx = findPackOfferIdx();
    const open = screen
      .getByTestId(`shop-offer-${idx}`)
      .querySelector("button.shop-offer-buy") as HTMLButtonElement;
    await user.click(open);
    await user.click(screen.getByTestId("pack-open-close"));
    expect(
      screen
        .getByTestId(`shop-offer-${idx}`)
        .querySelector("button.shop-offer-buy"),
    ).toHaveTextContent("Sold");
  });

  test("picking a planet from a Celestial pack does NOT add it to the consumable tray (auto-applied)", async () => {
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
    await user.click(screen.getByTestId("pack-open-pick-0"));
    expect(screen.queryAllByTestId(/^consumable-tile-filled-/)).toHaveLength(
      consumablesBefore,
    );
  });

  test("picking a planet from a Celestial pack upgrades the matching hand's level", async () => {
    shopPickerRngConfig.rng = () => 0.45;
    const user = await openShopWithMoney();
    const idx = findPackOfferIdx();
    const open = screen
      .getByTestId(`shop-offer-${idx}`)
      .querySelector("button.shop-offer-buy") as HTMLButtonElement;
    await user.click(open);
    await user.click(screen.getByTestId("pack-open-pick-0"));
    await user.click(screen.getByRole("button", { name: "Run info" }));
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
    await user.click(screen.getByTestId("pack-open-close"));
    expect(
      screen
        .getByTestId(`shop-offer-${idx}`)
        .querySelector("button.shop-offer-buy"),
    ).toHaveTextContent("Sold");
  });
});
