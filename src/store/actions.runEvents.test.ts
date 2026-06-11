// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import { humanPlayLog } from "../ai/humanPlayWiring";
import { createPlusFourMultJoker } from "../items/jokers/factories";
import { createPlanetCatalog } from "../items/planets";
import { useGame } from "./game";

beforeEach(() => {
  window.localStorage.clear();
  useGame.getState().resetGame();
});

describe("run event recording in store actions", () => {
  test("selling a joker records a joker-sell event", () => {
    useGame.getState().setJokers([createPlusFourMultJoker()]);
    useGame.getState().sellJoker(0);
    expect(humanPlayLog().counts()).toEqual({ "joker-sell": 1 });
  });

  test("buying a shop joker records a purchase with the offer context", () => {
    useGame.getState().setMoney(20);
    useGame.getState().setShopOffers([
      {
        kind: "joker",
        joker: createPlusFourMultJoker(),
        price: 5,
        sold: false,
      },
    ]);
    useGame.getState().buyShopOffer(0);
    expect(humanPlayLog().counts()).toEqual({ purchase: 1 });
  });

  test("the purchase record names the bought item", () => {
    useGame.getState().setMoney(20);
    useGame.getState().setShopOffers([
      {
        kind: "joker",
        joker: createPlusFourMultJoker(),
        price: 5,
        sold: false,
      },
    ]);
    useGame.getState().buyShopOffer(0);
    expect(humanPlayLog().toJsonl()).toContain('"id":"plus-four-mult"');
  });

  test("a purchase the player cannot afford records nothing", () => {
    useGame.getState().setMoney(1);
    useGame.getState().setShopOffers([
      {
        kind: "joker",
        joker: createPlusFourMultJoker(),
        price: 5,
        sold: false,
      },
    ]);
    useGame.getState().buyShopOffer(0);
    expect(humanPlayLog().count()).toBe(0);
  });


  test("rerolling the shop records a reroll with the rejected offers", () => {
    useGame.getState().setMoney(20);
    useGame.getState().setShopOffers([
      {
        kind: "joker",
        joker: createPlusFourMultJoker(),
        price: 5,
        sold: false,
      },
    ]);
    useGame.getState().rerollShopOffers(5);
    expect(humanPlayLog().counts()).toEqual({ reroll: 1 });
  });

  test("an unaffordable reroll records nothing", () => {
    useGame.getState().setMoney(2);
    useGame.getState().setShopOffers([
      {
        kind: "joker",
        joker: createPlusFourMultJoker(),
        price: 5,
        sold: false,
      },
    ]);
    useGame.getState().rerollShopOffers(5);
    expect(humanPlayLog().count()).toBe(0);
  });


  test("skipping an opened pack records a pack-pick with no chosen index", () => {
    const planet = createPlanetCatalog()[0];
    useGame.getState().setOpenedPack({
      pool: "celestial",
      variant: "normal",
      options: [{ kind: "planet", planet }],
    });
    useGame.getState().setPackPicksRemaining(1);
    useGame.getState().closeOpenedPack();
    expect(humanPlayLog().toJsonl()).toContain('"pickedIndex":null');
  });

  test("closing a fully-picked pack records nothing", () => {
    const planet = createPlanetCatalog()[0];
    useGame.getState().setOpenedPack({
      pool: "celestial",
      variant: "normal",
      options: [{ kind: "planet", planet }],
    });
    useGame.getState().setPackPicksRemaining(0);
    useGame.getState().closeOpenedPack();
    expect(humanPlayLog().count()).toBe(0);
  });

  test("buying an ante voucher records a voucher purchase", () => {
    const voucher = useGame.getState().currentAnteVouchers[0];
    if (!voucher) throw new Error("expected a seeded ante voucher");
    useGame.getState().setMoney(voucher.cost + 10);
    useGame.getState().buyAnteVoucher(0);
    expect(humanPlayLog().counts()).toEqual({ purchase: 1 });
  });
});
