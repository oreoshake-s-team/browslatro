import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Shop from "./Shop";
import { BASE_REROLL_COST, type ShopItem } from "../../items/shop";
import {
  MAX_JOKERS,
  createBusinessCardJoker,
  createPlusFourMultJoker,
  withEdition,
} from "../../items/jokers";
import { createPlanetCatalog } from "../../items/planets";
import { createTarotCatalog } from "../../items/tarots";
import type { Voucher, VoucherId } from "../../items/vouchers";

const OVERSTOCK_VOUCHER: Voucher = {
  id: "overstock",
  name: "Overstock",
  description: "Adds an extra shop slot.",
  cost: 10,
};

const OVERSTOCK_PLUS_VOUCHER: Voucher = {
  id: "overstock-plus",
  name: "Overstock Plus",
  description: "Adds yet another shop slot.",
  cost: 10,
  requires: "overstock",
};

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

function tarotOffer(sold = false): ShopItem {
  const tarot = createTarotCatalog()[0];
  return { kind: "tarot", tarot, price: 4, sold };
}

function renderShop(
  overrides: Partial<Parameters<typeof Shop>[0]> = {},
): ReturnType<typeof render> {
  return render(
    <Shop
      money={10}
      equippedJokerCount={0}
      consumableCount={0}
      consumableCapacity={2}
      offers={[jokerOffer("plus"), planetOffer("pluto")]}
      vouchers={[]}
      soldVoucherIds={new Set<VoucherId>()}
      ownedVoucherIds={new Set<VoucherId>()}
      onBuy={vi.fn()}
      onBuyVoucher={vi.fn()}
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

  test.each<{ kind: "joker" | "planet" | "tarot"; idx: 0 | 1; overrides?: Partial<Parameters<typeof Shop>[0]> }>([
    { kind: "joker", idx: 0 },
    { kind: "planet", idx: 1 },
    { kind: "tarot", idx: 0, overrides: { offers: [tarotOffer()] } },
  ])("the $kind offer carries the shop-offer-$kind modifier class", ({ kind, idx, overrides }) => {
    renderShop(overrides);
    expect(screen.getByTestId(`shop-offer-${idx}`)).toHaveClass(`shop-offer-${kind}`);
  });

  test.each<{ kind: "joker" | "planet" | "tarot"; label: "Joker" | "Planet" | "Tarot"; idx: 0 | 1; overrides?: Partial<Parameters<typeof Shop>[0]> }>([
    { kind: "joker", label: "Joker", idx: 0 },
    { kind: "planet", label: "Planet", idx: 1 },
    { kind: "tarot", label: "Tarot", idx: 0, overrides: { offers: [tarotOffer()] } },
  ])("the $kind offer renders a '$label' kind label", ({ label, idx, overrides }) => {
    renderShop(overrides);
    expect(screen.getByTestId(`shop-kind-${idx}`)).toHaveTextContent(label);
  });

  test("does not render a 'Planet' label on a joker offer (negative)", () => {
    renderShop({ offers: [jokerOffer("plus")] });
    expect(screen.getByTestId("shop-kind-0")).not.toHaveTextContent(
      "Planet",
    );
  });

  test("a sold offer still carries its kind modifier class", () => {
    renderShop({ offers: [jokerOffer("plus", true)] });
    const offer = screen.getByTestId("shop-offer-0");
    expect(offer).toHaveClass("shop-offer-joker");
  });

  test("a sold offer still carries the shop-offer-sold modifier", () => {
    renderShop({ offers: [jokerOffer("plus", true)] });
    expect(screen.getByTestId("shop-offer-0")).toHaveClass("shop-offer-sold");
  });

  test("an editioned joker offer exposes the edition via data-edition", () => {
    const offer: ShopItem = {
      kind: "joker",
      joker: withEdition(createPlusFourMultJoker(), "negative"),
      price: 0,
      sold: false,
    };
    renderShop({ offers: [offer] });
    expect(screen.getByTestId("shop-offer-0")).toHaveAttribute(
      "data-edition",
      "negative",
    );
  });

  test("an editioned joker offer renders a human-readable edition badge", () => {
    const offer: ShopItem = {
      kind: "joker",
      joker: withEdition(createPlusFourMultJoker(), "foil"),
      price: 0,
      sold: false,
    };
    renderShop({ offers: [offer] });
    expect(screen.getByTestId("shop-edition-0")).toHaveTextContent("Foil");
  });

  test("a free offer renders 'FREE' instead of a price", () => {
    const offer: ShopItem = {
      kind: "joker",
      joker: createPlusFourMultJoker(),
      price: 0,
      sold: false,
    };
    renderShop({ offers: [offer] });
    expect(screen.getByText("FREE")).toBeInTheDocument();
  });

  test("a free offer carries the shop-offer-free modifier class", () => {
    const offer: ShopItem = {
      kind: "joker",
      joker: createPlusFourMultJoker(),
      price: 0,
      sold: false,
    };
    renderShop({ offers: [offer] });
    expect(screen.getByTestId("shop-offer-0")).toHaveClass("shop-offer-free");
  });

  test("a base-edition joker offer has no edition badge (negative)", () => {
    renderShop({ offers: [jokerOffer("plus")] });
    expect(screen.queryByTestId("shop-edition-0")).not.toBeInTheDocument();
  });

  test("a base-edition joker offer has no data-edition attribute (negative)", () => {
    renderShop({ offers: [jokerOffer("plus")] });
    expect(screen.getByTestId("shop-offer-0")).not.toHaveAttribute(
      "data-edition",
    );
  });

  test("a non-zero priced offer does not render 'FREE' (negative)", () => {
    renderShop({ offers: [jokerOffer("plus")] });
    expect(screen.queryByText("FREE")).not.toBeInTheDocument();
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

    test("a free-rerolls reduction makes the first reroll cost $0", () => {
      renderShop({ extraRerollReduction: BASE_REROLL_COST });
      expect(screen.getByRole("button", { name: /Reroll/ })).toHaveTextContent(
        "Reroll ($0)",
      );
    });

    test("the reroll cost still escalates from $0 under a free-rerolls reduction", async () => {
      const user = userEvent.setup();
      renderShop({ money: 20, extraRerollReduction: BASE_REROLL_COST });
      await user.click(screen.getByRole("button", { name: /Reroll/ }));
      expect(screen.getByRole("button", { name: /Reroll/ })).toHaveTextContent(
        "Reroll ($1)",
      );
    });
  });

  describe("voucher slot", () => {
    test("renders the voucher slot region", () => {
      renderShop();
      expect(screen.getByTestId("shop-voucher")).toBeInTheDocument();
    });

    test("renders the empty placeholder when no voucher is available", () => {
      renderShop({ vouchers: [] });
      expect(screen.getByTestId("shop-voucher-empty")).toBeInTheDocument();
    });

    test("renders the voucher name when one is provided", () => {
      renderShop({ vouchers: [OVERSTOCK_VOUCHER] });
      expect(screen.getByText("Overstock")).toBeInTheDocument();
    });

    test("renders the voucher description when one is provided", () => {
      renderShop({ vouchers: [OVERSTOCK_VOUCHER] });
      expect(
        screen.getByText("Adds an extra shop slot."),
      ).toBeInTheDocument();
    });

    test("renders the voucher price when one is provided", () => {
      renderShop({ vouchers: [OVERSTOCK_VOUCHER] });
      expect(screen.getByText("$10")).toBeInTheDocument();
    });

    test("the buy button is enabled when affordable, unsold, and prereqs are met", () => {
      renderShop({ vouchers: [OVERSTOCK_VOUCHER], money: 10 });
      expect(screen.getByTestId("shop-voucher-buy-0")).toBeEnabled();
    });

    test("clicking the buy button invokes onBuyVoucher", async () => {
      const user = userEvent.setup();
      const onBuyVoucher = vi.fn();
      renderShop({ vouchers: [OVERSTOCK_VOUCHER], money: 10, onBuyVoucher });
      await user.click(screen.getByTestId("shop-voucher-buy-0"));
      expect(onBuyVoucher).toHaveBeenCalledTimes(1);
    });

    test("the buy button is disabled when the player cannot afford the voucher", () => {
      renderShop({ vouchers: [OVERSTOCK_VOUCHER], money: 4 });
      expect(screen.getByTestId("shop-voucher-buy-0")).toBeDisabled();
    });

    test("the buy button is disabled when the voucher is already sold", () => {
      renderShop({ vouchers: [OVERSTOCK_VOUCHER], soldVoucherIds: new Set<VoucherId>(["overstock"]), money: 50 });
      expect(screen.getByTestId("shop-voucher-buy-0")).toBeDisabled();
    });

    test("the buy button label reads 'Sold' when the voucher is already sold", () => {
      renderShop({ vouchers: [OVERSTOCK_VOUCHER], soldVoucherIds: new Set<VoucherId>(["overstock"]) });
      expect(screen.getByTestId("shop-voucher-buy-0")).toHaveTextContent("Sold");
    });

    test("the buy button is disabled when the prerequisite voucher is not owned", () => {
      renderShop({
        vouchers: [OVERSTOCK_PLUS_VOUCHER],
        money: 50,
        ownedVoucherIds: new Set<VoucherId>(),
      });
      expect(screen.getByTestId("shop-voucher-buy-0")).toBeDisabled();
    });

    test("the buy button is enabled once the prerequisite is owned", () => {
      renderShop({
        vouchers: [OVERSTOCK_PLUS_VOUCHER],
        money: 50,
        ownedVoucherIds: new Set<VoucherId>(["overstock"]),
      });
      expect(screen.getByTestId("shop-voucher-buy-0")).toBeEnabled();
    });

    test("clicking the buy button when disabled does not invoke onBuyVoucher", async () => {
      const user = userEvent.setup();
      const onBuyVoucher = vi.fn();
      renderShop({ vouchers: [OVERSTOCK_VOUCHER], money: 0, onBuyVoucher });
      await user.click(screen.getByTestId("shop-voucher-buy-0"));
      expect(onBuyVoucher).not.toHaveBeenCalled();
    });
  });

  describe("price discounts (Clearance Sale / Liquidation)", () => {
    test("shows the original price unmodified when no discount voucher is owned", () => {
      renderShop({ ownedVoucherIds: new Set<VoucherId>() });
      const planet = screen
        .getByTestId("shop-offer-1")
        .querySelector(".shop-offer-price");
      expect(planet).toHaveTextContent("$3");
    });

    test("applies a 25% discount with Clearance Sale ($5 joker → $4)", () => {
      renderShop({ ownedVoucherIds: new Set<VoucherId>(["clearance-sale"]) });
      const joker = screen
        .getByTestId("shop-offer-0")
        .querySelector(".shop-offer-price-discounted");
      expect(joker).toHaveTextContent("$4");
    });

    test("shows the original price struck through when discounted", () => {
      renderShop({ ownedVoucherIds: new Set<VoucherId>(["clearance-sale"]) });
      const original = screen
        .getByTestId("shop-offer-0")
        .querySelector(".shop-offer-price-original");
      expect(original).toHaveTextContent("$5");
    });

    test("applies a 50% discount with Liquidation ($5 joker → $3)", () => {
      renderShop({
        ownedVoucherIds: new Set<VoucherId>([
          "clearance-sale",
          "liquidation",
        ]),
      });
      const joker = screen
        .getByTestId("shop-offer-0")
        .querySelector(".shop-offer-price-discounted");
      expect(joker).toHaveTextContent("$3");
    });

    test("the buy button label reflects the discounted price", () => {
      renderShop({ ownedVoucherIds: new Set<VoucherId>(["clearance-sale"]) });
      const buy = screen
        .getByTestId("shop-offer-0")
        .querySelector("button.shop-offer-buy");
      expect(buy).toHaveTextContent("Buy ($4)");
    });

    test("the buy button is enabled when the player can afford the discounted price but not the original", () => {
      renderShop({
        money: 4,
        ownedVoucherIds: new Set<VoucherId>(["clearance-sale"]),
      });
      const buy = screen
        .getByTestId("shop-offer-0")
        .querySelector("button.shop-offer-buy");
      expect(buy).not.toBeDisabled();
    });
  });

  describe("Crystal Ball capacity", () => {
    test("the planet buy button stays enabled when consumables fill the base cap but capacity has room", () => {
      renderShop({ consumableCount: 2, consumableCapacity: 3 });
      const planetBuy = screen
        .getByTestId("shop-offer-1")
        .querySelector("button.shop-offer-buy");
      expect(planetBuy).not.toBeDisabled();
    });

    test("the full-tray tooltip reflects the elevated capacity", () => {
      renderShop({ consumableCount: 3, consumableCapacity: 3 });
      const planetBuy = screen
        .getByTestId("shop-offer-1")
        .querySelector("button.shop-offer-buy");
      expect(planetBuy).toHaveAttribute(
        "title",
        "Consumable slots are full (max 3)",
      );
    });
  });
});

describe("Shop pack offers", () => {
  function celestialPackOffer(
    variant: "normal" | "jumbo" | "mega",
    sold = false,
  ): ShopItem {
    return {
      kind: "pack",
      pack: {
        pool: "celestial",
        variant,
        options: [{ kind: "planet", planet: PLUTO }],
      },
      price: variant === "normal" ? 4 : variant === "jumbo" ? 6 : 8,
      sold,
    };
  }

  test("renders a Celestial pack offer with its display name", () => {
    renderShop({ offers: [celestialPackOffer("normal")] });
    expect(
      screen.getByTestId("shop-offer-0").querySelector(".shop-offer-name"),
    ).toHaveTextContent("Celestial Pack");
  });

  test("renders the Jumbo prefix on a Jumbo Celestial pack offer", () => {
    renderShop({ offers: [celestialPackOffer("jumbo")] });
    expect(
      screen.getByTestId("shop-offer-0").querySelector(".shop-offer-name"),
    ).toHaveTextContent("Jumbo Celestial Pack");
  });

  test("describes the pick semantics for a Normal pack (pick 1 from 3)", () => {
    renderShop({ offers: [celestialPackOffer("normal")] });
    expect(
      screen.getByTestId("shop-offer-0").querySelector(".shop-offer-description"),
    ).toHaveTextContent("Open to pick 1 card from 3 options");
  });

  test("describes the pick semantics for a Mega pack (pick 2 from 5)", () => {
    renderShop({ offers: [celestialPackOffer("mega")] });
    expect(
      screen.getByTestId("shop-offer-0").querySelector(".shop-offer-description"),
    ).toHaveTextContent("Open to pick 2 cards from 5 options");
  });

  test("tags pack offers with data-offer-kind=pack", () => {
    renderShop({ offers: [celestialPackOffer("normal")] });
    expect(screen.getByTestId("shop-offer-0")).toHaveAttribute(
      "data-offer-kind",
      "pack",
    );
  });

  test("the pack Open button shows the price", () => {
    renderShop({ offers: [celestialPackOffer("normal")] });
    const open = screen
      .getByTestId("shop-offer-0")
      .querySelector("button.shop-offer-buy");
    expect(open).toHaveTextContent("Open ($4)");
  });

  test("the pack Open button is enabled when the player can afford it", () => {
    renderShop({ offers: [celestialPackOffer("normal")], money: 10 });
    const open = screen
      .getByTestId("shop-offer-0")
      .querySelector("button.shop-offer-buy");
    expect(open).toBeEnabled();
  });

  test("the pack Open button is disabled when the player cannot afford it", () => {
    renderShop({ offers: [celestialPackOffer("normal")], money: 0 });
    const open = screen
      .getByTestId("shop-offer-0")
      .querySelector("button.shop-offer-buy");
    expect(open).toBeDisabled();
  });

  test("clicking an affordable pack Open button calls onBuy with the offer index", async () => {
    const user = userEvent.setup();
    const onBuy = vi.fn();
    renderShop({ offers: [celestialPackOffer("normal")], money: 10, onBuy });
    const open = screen
      .getByTestId("shop-offer-0")
      .querySelector("button.shop-offer-buy");
    if (!(open instanceof HTMLButtonElement)) throw new Error("missing button");
    await user.click(open);
    expect(onBuy).toHaveBeenCalledWith(0);
  });
});

describe("Shop voucher override picker (dev)", () => {
  const voucherOptions = [OVERSTOCK_VOUCHER, OVERSTOCK_PLUS_VOUCHER];

  test("does not render the override select without picker props (negative)", () => {
    renderShop();
    expect(screen.queryByTestId("shop-voucher-override")).toBeNull();
  });

  test("does not render the override select when onSetVoucher is missing (negative)", () => {
    renderShop({ voucherOptions });
    expect(screen.queryByTestId("shop-voucher-override")).toBeNull();
  });

  test("does not render the override select when voucherOptions is empty (negative)", () => {
    renderShop({ voucherOptions: [], onSetVoucher: vi.fn() });
    expect(screen.queryByTestId("shop-voucher-override")).toBeNull();
  });

  test("renders the override select when both picker props are provided", () => {
    renderShop({ voucherOptions, onSetVoucher: vi.fn() });
    expect(screen.getByTestId("shop-voucher-override")).toBeInTheDocument();
  });

  test("lists every provided voucher as an option", () => {
    renderShop({ voucherOptions, onSetVoucher: vi.fn() });
    expect(
      screen.getByTestId("shop-voucher-override").querySelectorAll("option"),
    ).toHaveLength(voucherOptions.length);
  });

  test("reflects the currently offered voucher as the selected value", () => {
    renderShop({
      voucherOptions,
      onSetVoucher: vi.fn(),
      vouchers: [OVERSTOCK_PLUS_VOUCHER],
    });
    expect(screen.getByTestId("shop-voucher-override")).toHaveValue(
      "overstock-plus",
    );
  });

  test("defaults the selection to the first option when no voucher is offered", () => {
    renderShop({ voucherOptions, onSetVoucher: vi.fn(), vouchers: [] });
    expect(screen.getByTestId("shop-voucher-override")).toHaveValue("overstock");
  });

  test("choosing a different voucher calls onSetVoucher with its id", async () => {
    const user = userEvent.setup();
    const onSetVoucher = vi.fn();
    renderShop({ voucherOptions, onSetVoucher, vouchers: [OVERSTOCK_VOUCHER] });
    await user.selectOptions(
      screen.getByTestId("shop-voucher-override"),
      "overstock-plus",
    );
    expect(onSetVoucher).toHaveBeenCalledWith("overstock-plus");
  });
});
