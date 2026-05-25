import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Shop from "./Shop";
import type { ShopItem } from "../../shop";
import {
  MAX_JOKERS,
  createBusinessCardJoker,
  createPlusFourMultJoker,
} from "../../jokers";
import { createPlanetCatalog } from "../../planets";

const PLUTO = createPlanetCatalog().find((p) => p.id === "pluto")!;
const MERCURY = createPlanetCatalog().find((p) => p.id === "mercury")!;

function jokerOffer(name: "plus" | "biz", sold = false): ShopItem {
  const joker =
    name === "plus" ? createPlusFourMultJoker() : createBusinessCardJoker();
  return { kind: "joker", joker, price: 5, sold };
}

function planetOffer(id: "pluto" | "mercury", sold = false): ShopItem {
  return {
    kind: "planet",
    planet: id === "pluto" ? PLUTO : MERCURY,
    price: 3,
    sold,
  };
}

function renderShop(
  overrides: Partial<Parameters<typeof Shop>[0]> = {},
): ReturnType<typeof render> {
  return render(
    <Shop
      money={10}
      equippedJokerCount={0}
      consumableCount={0}
      offers={[jokerOffer("plus"), planetOffer("pluto")]}
      onBuy={vi.fn()}
      onReroll={vi.fn()}
      onNext={vi.fn()}
      {...overrides}
    />,
  );
}

describe("Shop", () => {
  test("renders the Shop heading", () => {
    renderShop();
    expect(
      screen.getByRole("heading", { name: /Shop/ }),
    ).toBeInTheDocument();
  });

  test("renders the current money amount", () => {
    renderShop({ money: 42 });
    expect(screen.getByTestId("shop-money")).toHaveTextContent("$42");
  });

  test("renders exactly two offers", () => {
    renderShop();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  test("the joker offer renders its joker price", () => {
    renderShop();
    expect(screen.getAllByText("$5").length).toBeGreaterThanOrEqual(1);
  });

  test("the planet offer renders its planet price", () => {
    renderShop();
    expect(screen.getAllByText("$3").length).toBeGreaterThanOrEqual(1);
  });

  test("renders the planet offer's name", () => {
    renderShop();
    expect(screen.getByText("Pluto")).toBeInTheDocument();
  });

  test("tags each offer with its kind via data-offer-kind", () => {
    renderShop();
    expect(screen.getByTestId("shop-offer-0")).toHaveAttribute(
      "data-offer-kind",
      "joker",
    );
    expect(screen.getByTestId("shop-offer-1")).toHaveAttribute(
      "data-offer-kind",
      "planet",
    );
  });

  test("clicking an affordable buy button invokes onBuy with the offer index", async () => {
    const user = userEvent.setup();
    const onBuy = vi.fn();
    renderShop({ onBuy });
    const buyButtons = screen.getAllByRole("button", { name: /^Buy/ });
    await user.click(buyButtons[1]);
    expect(onBuy).toHaveBeenCalledWith(1);
  });

  test("the joker buy button is disabled when the player can't afford the joker price", () => {
    renderShop({ money: 4 });
    const buyButtons = screen.getAllByRole("button", { name: /^Buy/ });
    expect(buyButtons[0]).toBeDisabled();
  });

  test("the planet buy button stays enabled when joker slots are full", () => {
    renderShop({ equippedJokerCount: MAX_JOKERS });
    const planetBuy = screen
      .getByTestId("shop-offer-1")
      .querySelector("button.shop-offer-buy");
    expect(planetBuy).not.toBeDisabled();
  });

  test("the joker buy button is disabled and labeled when joker slots are full", () => {
    renderShop({ equippedJokerCount: MAX_JOKERS });
    expect(
      screen.getAllByRole("button", { name: /Slots full/ })[0],
    ).toBeDisabled();
  });

  test("the planet buy button is disabled when the player can't afford the planet price", () => {
    renderShop({ money: 2 });
    const planetBuy = screen
      .getByTestId("shop-offer-1")
      .querySelector("button.shop-offer-buy");
    expect(planetBuy).toBeDisabled();
  });

  test("the planet buy button is disabled when consumable slots are full", () => {
    renderShop({ consumableCount: 2 });
    const planetBuy = screen
      .getByTestId("shop-offer-1")
      .querySelector("button.shop-offer-buy");
    expect(planetBuy).toBeDisabled();
  });

  test("the planet buy button tooltip explains a full consumables tray", () => {
    renderShop({ consumableCount: 2 });
    const planetBuy = screen
      .getByTestId("shop-offer-1")
      .querySelector("button.shop-offer-buy");
    expect(planetBuy).toHaveAttribute(
      "title",
      "Consumable slots are full (max 2)",
    );
  });

  test("the joker buy button stays enabled when consumable slots are full", () => {
    renderShop({ consumableCount: 2 });
    const jokerBuy = screen
      .getByTestId("shop-offer-0")
      .querySelector("button.shop-offer-buy");
    expect(jokerBuy).not.toBeDisabled();
  });

  test("a sold offer renders a Sold button instead of a Buy button", () => {
    renderShop({
      offers: [jokerOffer("plus", true), planetOffer("pluto")],
    });
    expect(
      screen.getByRole("button", { name: /Sold/ }),
    ).toBeInTheDocument();
  });

  test("a sold offer's button is disabled", () => {
    renderShop({
      offers: [jokerOffer("plus", true), planetOffer("pluto")],
    });
    expect(screen.getByRole("button", { name: /Sold/ })).toBeDisabled();
  });

  test("a sold offer does not invoke onBuy when clicked", async () => {
    const user = userEvent.setup();
    const onBuy = vi.fn();
    renderShop({
      onBuy,
      offers: [jokerOffer("plus", true), planetOffer("pluto")],
    });
    await user.click(screen.getByRole("button", { name: /Sold/ }));
    expect(onBuy).not.toHaveBeenCalled();
  });

  test("clicking Next Round invokes onNext", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    renderShop({ onNext });
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  test("pressing Escape invokes onNext (skip purchase)", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    renderShop({ onNext });
    await user.keyboard("{Escape}");
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  describe("Reroll button", () => {
    test("renders a Reroll button with the base $5 cost on first render", () => {
      renderShop({ money: 10 });
      expect(
        screen.getByRole("button", { name: /Reroll shop offers for \$5/ }),
      ).toBeInTheDocument();
    });

    test("Reroll button label shows the current cost", () => {
      renderShop({ money: 10 });
      expect(screen.getByRole("button", { name: /Reroll/ })).toHaveTextContent(
        "Reroll ($5)",
      );
    });

    test("clicking Reroll invokes onReroll with the current cost", async () => {
      const user = userEvent.setup();
      const onReroll = vi.fn();
      renderShop({ money: 10, onReroll });
      await user.click(screen.getByRole("button", { name: /Reroll/ }));
      expect(onReroll).toHaveBeenCalledWith(5);
    });

    test("after one reroll, the button shows $6", async () => {
      const user = userEvent.setup();
      renderShop({ money: 20 });
      await user.click(screen.getByRole("button", { name: /Reroll/ }));
      expect(screen.getByRole("button", { name: /Reroll/ })).toHaveTextContent(
        "Reroll ($6)",
      );
    });

    test("after two rerolls, the button shows $7", async () => {
      const user = userEvent.setup();
      renderShop({ money: 20 });
      await user.click(screen.getByRole("button", { name: /Reroll/ }));
      await user.click(screen.getByRole("button", { name: /Reroll/ }));
      expect(screen.getByRole("button", { name: /Reroll/ })).toHaveTextContent(
        "Reroll ($7)",
      );
    });

    test("Reroll button is disabled when the player can't afford the cost", () => {
      renderShop({ money: 4 });
      expect(screen.getByRole("button", { name: /Reroll/ })).toBeDisabled();
    });

    test("Reroll button has a tooltip when the player can't afford it", () => {
      renderShop({ money: 4 });
      expect(screen.getByRole("button", { name: /Reroll/ })).toHaveAttribute(
        "title",
        "Not enough money to reroll",
      );
    });

    test("clicking Reroll when disabled does not invoke onReroll", async () => {
      const user = userEvent.setup();
      const onReroll = vi.fn();
      renderShop({ money: 4, onReroll });
      await user.click(screen.getByRole("button", { name: /Reroll/ }));
      expect(onReroll).not.toHaveBeenCalled();
    });

    test("clicking Reroll when disabled does not increment the reroll cost", async () => {
      const user = userEvent.setup();
      renderShop({ money: 4 });
      await user.click(screen.getByRole("button", { name: /Reroll/ }));
      expect(screen.getByRole("button", { name: /Reroll/ })).toHaveTextContent(
        "Reroll ($5)",
      );
    });
  });
});
