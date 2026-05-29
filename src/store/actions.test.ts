import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "./game";
import { MAX_JOKERS, createJokerCatalog, jokerSellValue } from "../items/jokers";
import { createPlanetCatalog } from "../items/planets";
import { consumableSellValue, type Consumable } from "../items/consumables";
import { VOUCHER_CATALOG } from "../items/vouchers";
import { packPickLimit, type PackOffer } from "../items/packs";

describe("game actions slice", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("sellJoker adds the joker's sell value to the wallet", () => {
    const joker = createJokerCatalog()[0];
    const game = useGame.getState();
    game.setJokers([joker]);
    const before = game.money;
    game.sellJoker(0);
    expect(useGame.getState().money).toBe(before + jokerSellValue(joker));
  });

  test("sellJoker removes the joker from the row", () => {
    useGame.getState().setJokers([createJokerCatalog()[0]]);
    useGame.getState().sellJoker(0);
    expect(useGame.getState().jokers).toHaveLength(0);
  });

  test("sellJoker is a no-op for an out-of-range index (negative)", () => {
    const before = useGame.getState().money;
    useGame.getState().sellJoker(5);
    expect(useGame.getState().money).toBe(before);
  });

  test("sellConsumable adds the consumable's sell value to the wallet", () => {
    const consumable: Consumable = {
      kind: "planet",
      card: createPlanetCatalog()[0],
    };
    const game = useGame.getState();
    game.setConsumables([consumable]);
    const before = game.money;
    game.sellConsumable(0);
    expect(useGame.getState().money).toBe(before + consumableSellValue(consumable));
  });

  test("reorderJokers moves the listed ids to the front in order", () => {
    const [a, b] = createJokerCatalog();
    useGame.getState().setJokers([a, b]);
    useGame.getState().reorderJokers([b.id, a.id]);
    expect(useGame.getState().jokers.map((j) => j.id)).toEqual([b.id, a.id]);
  });

  test("buyAnteVoucher marks the voucher owned when affordable", () => {
    const voucher = VOUCHER_CATALOG.find((v) => !v.requires);
    if (!voucher) throw new Error("expected a prereq-free voucher");
    const game = useGame.getState();
    game.setCurrentAnteVouchers([voucher]);
    game.setMoney(voucher.cost + 5);
    game.buyAnteVoucher(0);
    expect(useGame.getState().ownedVoucherIds.has(voucher.id)).toBe(true);
  });

  test("buyAnteVoucher is a no-op when unaffordable (negative)", () => {
    const voucher = VOUCHER_CATALOG.find((v) => !v.requires);
    if (!voucher) throw new Error("expected a prereq-free voucher");
    const game = useGame.getState();
    game.setCurrentAnteVouchers([voucher]);
    game.setMoney(voucher.cost - 1);
    game.buyAnteVoucher(0);
    expect(useGame.getState().ownedVoucherIds.has(voucher.id)).toBe(false);
  });

  test("rerollShopOffers spends the reroll cost", () => {
    const game = useGame.getState();
    game.setShopOffers([]);
    game.setMoney(20);
    game.rerollShopOffers(5);
    expect(useGame.getState().money).toBe(15);
  });

  test("markOfferSold marks the targeted offer sold", () => {
    const joker = createJokerCatalog()[0];
    const game = useGame.getState();
    game.setShopOffers([{ kind: "joker", joker, price: 3, sold: false }]);
    game.markOfferSold(0);
    expect(useGame.getState().shopOffers?.[0]?.sold).toBe(true);
  });

  test("openPackOffer stores the opened pack", () => {
    const pack: PackOffer = { pool: "arcana", variant: "normal", options: [] };
    useGame.getState().openPackOffer(pack);
    expect(useGame.getState().openedPack).toBe(pack);
  });

  test("openPackOffer seeds picks remaining from the pack pick limit", () => {
    const pack: PackOffer = { pool: "arcana", variant: "normal", options: [] };
    useGame.getState().openPackOffer(pack);
    expect(useGame.getState().packPicksRemaining).toBe(packPickLimit("normal"));
  });

  test("openPackOffer builds a preview hand for an arcana pack", () => {
    const pack: PackOffer = { pool: "arcana", variant: "normal", options: [] };
    useGame.getState().openPackOffer(pack);
    expect(useGame.getState().packPreviewHand.length).toBeGreaterThan(0);
  });

  test("openPackOffer leaves the preview empty for a celestial pack (negative)", () => {
    const pack: PackOffer = { pool: "celestial", variant: "normal", options: [] };
    useGame.getState().openPackOffer(pack);
    expect(useGame.getState().packPreviewHand).toHaveLength(0);
  });

  test("openPack opens a purchased pack offer", () => {
    const pack: PackOffer = { pool: "arcana", variant: "normal", options: [] };
    const game = useGame.getState();
    game.setShopOffers([{ kind: "pack", pack, price: 3, sold: false }]);
    game.setMoney(10);
    game.openPack(0);
    expect(useGame.getState().openedPack).toBe(pack);
  });

  test("openPack spends the pack price", () => {
    const pack: PackOffer = { pool: "arcana", variant: "normal", options: [] };
    const game = useGame.getState();
    game.setShopOffers([{ kind: "pack", pack, price: 3, sold: false }]);
    game.setMoney(10);
    game.openPack(0);
    expect(useGame.getState().money).toBe(7);
  });

  test("openPack returns false when the pack is unaffordable (negative)", () => {
    const pack: PackOffer = { pool: "arcana", variant: "normal", options: [] };
    const game = useGame.getState();
    game.setShopOffers([{ kind: "pack", pack, price: 9, sold: false }]);
    game.setMoney(2);
    expect(game.openPack(0)).toBe(false);
  });

  test("openPack returns false for a non-pack offer (negative)", () => {
    const joker = createJokerCatalog()[0];
    const game = useGame.getState();
    game.setShopOffers([{ kind: "joker", joker, price: 1, sold: false }]);
    game.setMoney(10);
    expect(game.openPack(0)).toBe(false);
  });

  test("decrementPackPicks reduces the remaining picks", () => {
    const game = useGame.getState();
    game.setPackPicksRemaining(2);
    game.decrementPackPicks();
    expect(useGame.getState().packPicksRemaining).toBe(1);
  });

  test("decrementPackPicks closes the pack when picks run out", () => {
    const game = useGame.getState();
    game.setOpenedPack({ pool: "arcana", variant: "normal", options: [] });
    game.setPackPicksRemaining(1);
    game.decrementPackPicks();
    expect(useGame.getState().openedPack).toBeNull();
  });

  test("closeOpenedPack clears the opened pack", () => {
    const game = useGame.getState();
    game.setOpenedPack({ pool: "arcana", variant: "normal", options: [] });
    game.closeOpenedPack();
    expect(useGame.getState().openedPack).toBeNull();
  });

  test("buyShopOffer adds a purchased joker to the row", () => {
    const joker = createJokerCatalog()[0];
    const game = useGame.getState();
    game.setShopOffers([{ kind: "joker", joker, price: 3, sold: false }]);
    game.setMoney(10);
    game.buyShopOffer(0);
    expect(useGame.getState().jokers.map((j) => j.id)).toContain(joker.id);
  });

  test("buyShopOffer records the bought joker id for the shop visit", () => {
    const joker = createJokerCatalog()[0];
    const game = useGame.getState();
    game.setShopOffers([{ kind: "joker", joker, price: 3, sold: false }]);
    game.setMoney(10);
    game.buyShopOffer(0);
    expect(useGame.getState().soldJokerIdsThisShopVisit).toContain(joker.id);
  });

  test("buyShopOffer returns false when unaffordable (negative)", () => {
    const joker = createJokerCatalog()[0];
    const game = useGame.getState();
    game.setShopOffers([{ kind: "joker", joker, price: 9, sold: false }]);
    game.setMoney(2);
    expect(game.buyShopOffer(0)).toBe(false);
  });

  test("buyShopOffer adds a consumable for a planet offer", () => {
    const planet = createPlanetCatalog()[0];
    const game = useGame.getState();
    game.setShopOffers([{ kind: "planet", planet, price: 3, sold: false }]);
    game.setMoney(10);
    game.buyShopOffer(0);
    expect(useGame.getState().consumables).toHaveLength(1);
  });

  test("buyShopOffer is a no-op when the joker row is full (negative)", () => {
    const catalog = createJokerCatalog();
    const game = useGame.getState();
    game.setJokers(catalog.slice(0, MAX_JOKERS));
    game.setShopOffers([
      { kind: "joker", joker: catalog[MAX_JOKERS], price: 1, sold: false },
    ]);
    game.setMoney(10);
    game.buyShopOffer(0);
    expect(useGame.getState().jokers).toHaveLength(MAX_JOKERS);
  });
});
