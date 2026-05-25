import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Shop, { type ShopOffer } from "./Shop";
import {
  MAX_JOKERS,
  createBusinessCardJoker,
  createPlusFourMultJoker,
} from "../../jokers";

function makeOffer(name: "plus" | "biz", sold = false): ShopOffer {
  const joker =
    name === "plus" ? createPlusFourMultJoker() : createBusinessCardJoker();
  return { joker, sold };
}

function renderShop(
  overrides: Partial<Parameters<typeof Shop>[0]> = {},
): ReturnType<typeof render> {
  return render(
    <Shop
      money={10}
      equippedJokerCount={0}
      offers={[makeOffer("plus"), makeOffer("biz")]}
      pricePerJoker={5}
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

  test("each offer shows its price", () => {
    renderShop({ pricePerJoker: 5 });
    const priceLabels = screen.getAllByText("$5");
    expect(priceLabels.length).toBeGreaterThanOrEqual(2);
  });

  test("clicking an affordable buy button invokes onBuy with the offer index", async () => {
    const user = userEvent.setup();
    const onBuy = vi.fn();
    renderShop({ onBuy });
    const buyButtons = screen.getAllByRole("button", { name: /^Buy/ });
    await user.click(buyButtons[1]);
    expect(onBuy).toHaveBeenCalledWith(1);
  });

  test("the buy button is disabled when the player can't afford the price", () => {
    renderShop({ money: 4, pricePerJoker: 5 });
    const buyButtons = screen.getAllByRole("button", { name: /^Buy/ });
    expect(buyButtons[0]).toBeDisabled();
  });

  test("the buy button is disabled and labeled when joker slots are full", () => {
    renderShop({ equippedJokerCount: MAX_JOKERS });
    expect(
      screen.getAllByRole("button", { name: /Slots full/ })[0],
    ).toBeDisabled();
  });

  test("a sold offer renders a Sold button instead of a Buy button", () => {
    renderShop({
      offers: [makeOffer("plus", true), makeOffer("biz")],
    });
    expect(
      screen.getByRole("button", { name: /Sold/ }),
    ).toBeInTheDocument();
  });

  test("a sold offer's button is disabled", () => {
    renderShop({
      offers: [makeOffer("plus", true), makeOffer("biz")],
    });
    expect(screen.getByRole("button", { name: /Sold/ })).toBeDisabled();
  });

  test("a sold offer does not invoke onBuy when clicked", async () => {
    const user = userEvent.setup();
    const onBuy = vi.fn();
    renderShop({
      onBuy,
      offers: [makeOffer("plus", true), makeOffer("biz")],
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
