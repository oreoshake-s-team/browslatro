import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useGame } from "./game";
import {
  MAX_JOKERS,
  PERISHABLE_LIFE,
  POPCORN_MULT,
  POPCORN_MULT_LOSS_PER_ROUND,
  createJokerCatalog,
  createPopcornJoker,
  hasSticker,
  isJokerActive,
  jokerSellValue,
} from "../items/jokers";
import { createPlanetCatalog } from "../items/planets";
import { consumableSellValue, type Consumable } from "../items/consumables";
import { VOUCHER_CATALOG } from "../items/vouchers";
import { packPickLimit, type PackOffer } from "../items/packs";
import { createDeck } from "../cards/deck";
import { buildShuffledDeck } from "../cards/deckBuild";
import { forceShopLayout, shopPickerRngConfig } from "../items/shop";
import { BASE_VOUCHER_SLOTS } from "./vouchers";
import { applyBossFaceDown, createBossCatalog } from "../items/bosses";
import { FINAL_ANTE } from "../constants";

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

  test("sellJoker is a no-op for an eternal joker", () => {
    const joker = {
      ...createJokerCatalog()[0],
      stickers: [{ kind: "eternal" as const }],
    };
    useGame.getState().setJokers([joker]);
    useGame.getState().sellJoker(0);
    expect(useGame.getState().jokers).toHaveLength(1);
  });

  test("sellJoker does not pay out for an eternal joker", () => {
    const joker = {
      ...createJokerCatalog()[0],
      stickers: [{ kind: "eternal" as const }],
    };
    const game = useGame.getState();
    game.setJokers([joker]);
    const before = useGame.getState().money;
    game.sellJoker(0);
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

  test("buyAnteVoucher applies Clearance Sale 25% off", () => {
    const voucher = VOUCHER_CATALOG.find(
      (v) => !v.requires && v.id !== "clearance-sale",
    );
    if (!voucher) throw new Error("expected a prereq-free voucher");
    const game = useGame.getState();
    game.setOwnedVoucherIds(new Set(["clearance-sale"]));
    game.setCurrentAnteVouchers([voucher]);
    game.setMoney(voucher.cost);
    game.buyAnteVoucher(0);
    const expected = voucher.cost - Math.ceil(voucher.cost * 0.75);
    expect(useGame.getState().money).toBe(expected);
  });

  test("buyAnteVoucher applies Liquidation 50% off", () => {
    const voucher = VOUCHER_CATALOG.find(
      (v) => !v.requires && v.id !== "clearance-sale" && v.id !== "liquidation",
    );
    if (!voucher) throw new Error("expected a prereq-free voucher");
    const game = useGame.getState();
    game.setOwnedVoucherIds(new Set(["clearance-sale", "liquidation"]));
    game.setCurrentAnteVouchers([voucher]);
    game.setMoney(voucher.cost);
    game.buyAnteVoucher(0);
    const expected = voucher.cost - Math.ceil(voucher.cost * 0.5);
    expect(useGame.getState().money).toBe(expected);
  });

  test("buyAnteVoucher succeeds at the discounted price when full price is unaffordable (negative)", () => {
    const voucher = VOUCHER_CATALOG.find(
      (v) => !v.requires && v.id !== "clearance-sale",
    );
    if (!voucher) throw new Error("expected a prereq-free voucher");
    const game = useGame.getState();
    game.setOwnedVoucherIds(new Set(["clearance-sale"]));
    game.setCurrentAnteVouchers([voucher]);
    const discounted = Math.max(1, Math.ceil(voucher.cost * 0.75));
    game.setMoney(discounted);
    game.buyAnteVoucher(0);
    expect(useGame.getState().ownedVoucherIds.has(voucher.id)).toBe(true);
  });

  test("buyAnteVoucher Hieroglyph decrements ante by 1", () => {
    const hieroglyph = VOUCHER_CATALOG.find((v) => v.id === "hieroglyph");
    if (!hieroglyph) throw new Error("expected Hieroglyph voucher");
    const game = useGame.getState();
    game.setAnte(3);
    game.setCurrentAnteVouchers([hieroglyph]);
    game.setMoney(hieroglyph.cost);
    game.buyAnteVoucher(0);
    expect(useGame.getState().ante).toBe(2);
  });

  test("buyAnteVoucher Hieroglyph clamps ante to a minimum of 1", () => {
    const hieroglyph = VOUCHER_CATALOG.find((v) => v.id === "hieroglyph");
    if (!hieroglyph) throw new Error("expected Hieroglyph voucher");
    const game = useGame.getState();
    game.setAnte(1);
    game.setCurrentAnteVouchers([hieroglyph]);
    game.setMoney(hieroglyph.cost);
    game.buyAnteVoucher(0);
    expect(useGame.getState().ante).toBe(1);
  });

  test("buyAnteVoucher Petroglyph requires Hieroglyph (negative)", () => {
    const petroglyph = VOUCHER_CATALOG.find((v) => v.id === "petroglyph");
    if (!petroglyph) throw new Error("expected Petroglyph voucher");
    const game = useGame.getState();
    game.setCurrentAnteVouchers([petroglyph]);
    game.setMoney(petroglyph.cost);
    game.buyAnteVoucher(0);
    expect(useGame.getState().ownedVoucherIds.has("petroglyph")).toBe(false);
  });

  test("buyAnteVoucher Petroglyph decrements ante by 1 when Hieroglyph is owned", () => {
    const petroglyph = VOUCHER_CATALOG.find((v) => v.id === "petroglyph");
    if (!petroglyph) throw new Error("expected Petroglyph voucher");
    const game = useGame.getState();
    game.setOwnedVoucherIds(new Set(["hieroglyph"]));
    game.setAnte(4);
    game.setCurrentAnteVouchers([petroglyph]);
    game.setMoney(petroglyph.cost);
    game.buyAnteVoucher(0);
    expect(useGame.getState().ante).toBe(3);
  });

  test("buyAnteVoucher Hieroglyph immediately decrements remainingHands", () => {
    const hieroglyph = VOUCHER_CATALOG.find((v) => v.id === "hieroglyph");
    if (!hieroglyph) throw new Error("expected Hieroglyph voucher");
    const game = useGame.getState();
    game.setRemainingHands(4);
    game.setCurrentAnteVouchers([hieroglyph]);
    game.setMoney(hieroglyph.cost);
    game.buyAnteVoucher(0);
    expect(useGame.getState().remainingHands).toBe(3);
  });

  test("buyAnteVoucher Petroglyph immediately decrements remainingDiscards", () => {
    const petroglyph = VOUCHER_CATALOG.find((v) => v.id === "petroglyph");
    if (!petroglyph) throw new Error("expected Petroglyph voucher");
    const game = useGame.getState();
    game.setOwnedVoucherIds(new Set(["hieroglyph"]));
    game.setRemainingDiscards(3);
    game.setCurrentAnteVouchers([petroglyph]);
    game.setMoney(petroglyph.cost);
    game.buyAnteVoucher(0);
    expect(useGame.getState().remainingDiscards).toBe(2);
  });

  test("buyAnteVoucher Hieroglyph never drives remainingHands below 0", () => {
    const hieroglyph = VOUCHER_CATALOG.find((v) => v.id === "hieroglyph");
    if (!hieroglyph) throw new Error("expected Hieroglyph voucher");
    const game = useGame.getState();
    game.setRemainingHands(0);
    game.setCurrentAnteVouchers([hieroglyph]);
    game.setMoney(hieroglyph.cost);
    game.buyAnteVoucher(0);
    expect(useGame.getState().remainingHands).toBe(0);
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

  test("openPackOffer resets pickedPackOptionIndices even if previously populated", () => {
    const game = useGame.getState();
    game.setPickedPackOptionIndices(new Set([0, 1]));
    game.openPackOffer({ pool: "arcana", variant: "mega", options: [] });
    expect(useGame.getState().pickedPackOptionIndices.size).toBe(0);
  });

  test("decrementPackPicks clears pickedPackOptionIndices once picks reach zero", () => {
    const game = useGame.getState();
    game.setOpenedPack({ pool: "arcana", variant: "mega", options: [] });
    game.setPackPicksRemaining(1);
    game.setPickedPackOptionIndices(new Set([0]));
    game.decrementPackPicks();
    expect(useGame.getState().pickedPackOptionIndices.size).toBe(0);
  });

  test("decrementPackPicks keeps pickedPackOptionIndices while picks remain", () => {
    const game = useGame.getState();
    game.setOpenedPack({ pool: "arcana", variant: "mega", options: [] });
    game.setPackPicksRemaining(2);
    game.setPickedPackOptionIndices(new Set([0]));
    game.decrementPackPicks();
    expect(useGame.getState().pickedPackOptionIndices.has(0)).toBe(true);
  });

  test("closeOpenedPack clears pickedPackOptionIndices", () => {
    const game = useGame.getState();
    game.setOpenedPack({ pool: "arcana", variant: "mega", options: [] });
    game.setPickedPackOptionIndices(new Set([1]));
    game.closeOpenedPack();
    expect(useGame.getState().pickedPackOptionIndices.size).toBe(0);
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

  test("buyShopOffer allows MAX_JOKERS + 1 jokers when Black Deck is selected", () => {
    const catalog = createJokerCatalog();
    const game = useGame.getState();
    game.setSelectedDeck("black-deck");
    game.setJokers(catalog.slice(0, MAX_JOKERS));
    game.setShopOffers([
      { kind: "joker", joker: catalog[MAX_JOKERS], price: 1, sold: false },
    ]);
    game.setMoney(10);
    game.buyShopOffer(0);
    expect(useGame.getState().jokers).toHaveLength(MAX_JOKERS + 1);
  });

  test("buyShopOffer with Red Deck still caps at MAX_JOKERS (negative)", () => {
    const catalog = createJokerCatalog();
    const game = useGame.getState();
    game.setSelectedDeck("red-deck");
    game.setJokers(catalog.slice(0, MAX_JOKERS));
    game.setShopOffers([
      { kind: "joker", joker: catalog[MAX_JOKERS], price: 1, sold: false },
    ]);
    game.setMoney(10);
    game.buyShopOffer(0);
    expect(useGame.getState().jokers).toHaveLength(MAX_JOKERS);
  });

  test("buyShopOffer appends a plain Magic Trick playing-card to addedCards", () => {
    const game = useGame.getState();
    const card = { id: 999, rank: "K" as const, suit: "spades" as const };
    game.setShopOffers([
      { kind: "playing-card", card, price: 4, sold: false },
    ]);
    game.setMoney(10);
    game.buyShopOffer(0);
    expect(
      useGame.getState().addedCards.some((c) => c.id === 999),
    ).toBe(true);
  });

  test("buyShopOffer preserves enhancement/edition/seal from an Illusion playing-card offer", () => {
    const game = useGame.getState();
    const card = {
      id: 1000,
      rank: "5" as const,
      suit: "hearts" as const,
      enhancement: "mult" as const,
      edition: "foil" as const,
      seal: "gold" as const,
    };
    game.setShopOffers([
      { kind: "playing-card", card, price: 4, sold: false },
    ]);
    game.setMoney(10);
    game.buyShopOffer(0);
    const added = useGame.getState().addedCards.find((c) => c.id === 1000);
    expect(
      added?.enhancement === "mult" &&
        added?.edition === "foil" &&
        added?.seal === "gold",
    ).toBe(true);
  });

  test("buyShopOffer marks a playing-card offer sold after purchase", () => {
    const game = useGame.getState();
    const card = { id: 1001, rank: "3" as const, suit: "diamonds" as const };
    game.setShopOffers([
      { kind: "playing-card", card, price: 4, sold: false },
    ]);
    game.setMoney(10);
    game.buyShopOffer(0);
    const offers = useGame.getState().shopOffers;
    expect(offers?.[0]?.sold).toBe(true);
  });

  test("buyShopOffer for a playing-card returns false when unaffordable (negative)", () => {
    const game = useGame.getState();
    const card = { id: 1002, rank: "A" as const, suit: "clubs" as const };
    game.setShopOffers([
      { kind: "playing-card", card, price: 4, sold: false },
    ]);
    game.setMoney(1);
    expect(game.buyShopOffer(0)).toBe(false);
  });

  test("handleWin increments the round counter", () => {
    useGame.getState().handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().round).toBe(2);
  });

  test("handleWin pays the blind reward into the wallet", () => {
    const game = useGame.getState();
    game.setMoney(0);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().money).toBe(3);
  });

  test("handleWin uses the precomputed interest when provided", () => {
    const game = useGame.getState();
    game.setMoney(0);
    game.handleWin({ interest: 7, interestWallet: 100 });
    expect(useGame.getState().money).toBe(10);
  });

  test("handleWin advances the blind when below the boss blind", () => {
    useGame.getState().handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().blind).toBe(2);
  });

  test("handleWin does not advance the ante below the boss blind (negative)", () => {
    useGame.getState().handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().ante).toBe(1);
  });

  test("handleWin advances the ante after the boss blind", () => {
    const game = useGame.getState();
    game.setBlind(3);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().ante).toBe(2);
  });

  test("handleWin resets to the first blind after the boss blind", () => {
    const game = useGame.getState();
    game.setBlind(3);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().blind).toBe(1);
  });

  test("handleWin resets remainingHands to the upcoming round's starting hands", () => {
    const game = useGame.getState();
    game.setRemainingHands(0);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().remainingHands).toBe(4);
  });

  test("handleWin resets remainingDiscards to the upcoming round's starting discards", () => {
    const game = useGame.getState();
    game.setSelectedDeck("yellow-deck");
    game.setRemainingDiscards(0);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().remainingDiscards).toBe(3);
  });

  test("handleWin reflects Hieroglyph penalty in the reset remainingHands", () => {
    const game = useGame.getState();
    game.setOwnedVoucherIds(new Set(["hieroglyph"]));
    game.setRemainingHands(0);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().remainingHands).toBe(3);
  });

  test("handleWin ticks the Perishable roundsHeld counter", () => {
    const base = createJokerCatalog()[0];
    const game = useGame.getState();
    game.setJokers([{ ...base, stickers: [{ kind: "perishable", roundsHeld: 2 }] }]);
    game.handleWin({ interest: 0, interestWallet: 0 });
    const next = useGame.getState().jokers[0].stickers?.[0];
    expect(next).toEqual({ kind: "perishable", roundsHeld: 3 });
  });

  test("after PERISHABLE_LIFE handleWin calls, the joker is no longer active", () => {
    const base = createJokerCatalog()[0];
    const game = useGame.getState();
    game.setJokers([{ ...base, stickers: [{ kind: "perishable", roundsHeld: 0 }] }]);
    for (let i = 0; i < PERISHABLE_LIFE; i += 1) {
      useGame.getState().handleWin({ interest: 0, interestWallet: 0 });
    }
    expect(isJokerActive(useGame.getState().jokers[0])).toBe(false);
  });

  test("at PERISHABLE_LIFE - 1 ticks, the joker is still active (negative)", () => {
    const base = createJokerCatalog()[0];
    const game = useGame.getState();
    game.setJokers([{ ...base, stickers: [{ kind: "perishable", roundsHeld: 0 }] }]);
    for (let i = 0; i < PERISHABLE_LIFE - 1; i += 1) {
      useGame.getState().handleWin({ interest: 0, interestWallet: 0 });
    }
    expect(isJokerActive(useGame.getState().jokers[0])).toBe(true);
  });

  test("handleWin applies the round-end joker pass (Popcorn decays)", () => {
    const game = useGame.getState();
    game.setJokers([createPopcornJoker()]);
    game.setBlind(1);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().jokers[0].state).toEqual({
      kind: "counter",
      value: POPCORN_MULT - POPCORN_MULT_LOSS_PER_ROUND,
    });
  });

  test("handleWin does not add a Perishable sticker to a non-stickered joker (negative)", () => {
    const base = createJokerCatalog()[0];
    const game = useGame.getState();
    game.setJokers([base]);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(hasSticker(useGame.getState().jokers[0], "perishable")).toBe(false);
  });

  test("handleWin on the final-ante Boss Blind sets pendingGameWon", () => {
    const game = useGame.getState();
    game.setAnte(FINAL_ANTE);
    game.setBlind(3);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().pendingGameWon).not.toBeNull();
  });

  test("handleWin on the final-ante Boss Blind does NOT advance ante past the final ante", () => {
    const game = useGame.getState();
    game.setAnte(FINAL_ANTE);
    game.setBlind(3);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().ante).toBe(FINAL_ANTE);
  });

  test("handleWin on the final-ante Boss Blind does NOT populate shopOffers", () => {
    const game = useGame.getState();
    game.setAnte(FINAL_ANTE);
    game.setBlind(3);
    game.setShopOffers(null);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().shopOffers).toBeNull();
  });

  test("handleWin on a pre-final Boss Blind advances ante and leaves pendingGameWon null (negative)", () => {
    const game = useGame.getState();
    game.setAnte(FINAL_ANTE - 1);
    game.setBlind(3);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().ante).toBe(FINAL_ANTE);
    expect(useGame.getState().pendingGameWon).toBeNull();
  });

  test("pendingGameWon snapshot carries finalAnte, money, hands played, and skips", () => {
    const game = useGame.getState();
    game.setAnte(FINAL_ANTE);
    game.setBlind(3);
    game.setMoney(0);
    game.setRunStats({ handsPlayed: 17, unusedDiscards: 4, blindsSkipped: 2 });
    game.handleWin({ interest: 0, interestWallet: 0 });
    const snap = useGame.getState().pendingGameWon;
    expect(snap).toEqual({
      finalAnte: FINAL_ANTE,
      finalMoney: useGame.getState().money,
      handsPlayed: 17,
      blindsSkipped: 2,
    });
  });

  test("continueEndless clears pendingGameWon and enables endless mode", () => {
    const game = useGame.getState();
    game.setAnte(FINAL_ANTE);
    game.setBlind(3);
    game.handleWin({ interest: 0, interestWallet: 0 });
    useGame.getState().continueEndless();
    expect(useGame.getState().pendingGameWon).toBeNull();
    expect(useGame.getState().endlessMode).toBe(true);
  });

  test("continueEndless advances to the ante past the final ante", () => {
    const game = useGame.getState();
    game.setAnte(FINAL_ANTE);
    game.setBlind(3);
    game.handleWin({ interest: 0, interestWallet: 0 });
    useGame.getState().continueEndless();
    expect(useGame.getState().ante).toBe(FINAL_ANTE + 1);
    expect(useGame.getState().blind).toBe(1);
  });

  test("continueEndless opens the post-boss shop", () => {
    const game = useGame.getState();
    game.setAnte(FINAL_ANTE);
    game.setBlind(3);
    game.setShopOffers(null);
    game.handleWin({ interest: 0, interestWallet: 0 });
    useGame.getState().continueEndless();
    expect(useGame.getState().shopOffers).not.toBeNull();
  });

  test("continueEndless is a no-op without a pending win (negative)", () => {
    const game = useGame.getState();
    game.setAnte(3);
    game.continueEndless();
    expect(useGame.getState().ante).toBe(3);
    expect(useGame.getState().endlessMode).toBe(false);
  });

  test("handleWin in endless mode advances past the final ante instead of re-winning", () => {
    const game = useGame.getState();
    game.setAnte(FINAL_ANTE);
    game.setBlind(3);
    game.setEndlessMode(true);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().pendingGameWon).toBeNull();
    expect(useGame.getState().ante).toBe(FINAL_ANTE + 1);
  });

  test("endless boss win past the final ante keeps advancing antes", () => {
    const game = useGame.getState();
    game.setAnte(FINAL_ANTE + 2);
    game.setBlind(3);
    game.setEndlessMode(true);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().ante).toBe(FINAL_ANTE + 3);
    expect(useGame.getState().pendingGameWon).toBeNull();
  });

  test("handleWin awards $0 for Small Blind on Red Stake", () => {
    const game = useGame.getState();
    game.setMoney(0);
    game.setSelectedStake("red");
    game.setBlind(1);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().money).toBe(0);
  });

  test("handleWin awards $0 for Small Blind on Gold (Red modifier cumulative)", () => {
    const game = useGame.getState();
    game.setMoney(0);
    game.setSelectedStake("gold");
    game.setBlind(1);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().money).toBe(0);
  });

  test("handleWin still pays the Big Blind reward on Red Stake (negative)", () => {
    const game = useGame.getState();
    game.setMoney(0);
    game.setSelectedStake("red");
    game.setBlind(2);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().money).toBe(4);
  });

  test("handleWin still pays the Small Blind reward on White Stake (negative)", () => {
    const game = useGame.getState();
    game.setMoney(0);
    game.setSelectedStake("white");
    game.setBlind(1);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().money).toBe(3);
  });

  test("handleWin still pays interest on Red Stake Small Blind", () => {
    const game = useGame.getState();
    game.setMoney(0);
    game.setSelectedStake("red");
    game.setBlind(1);
    game.handleWin({ interest: 4, interestWallet: 100 });
    expect(useGame.getState().money).toBe(4);
  });

  test("handleWin does not log Small Blind reward event on Red Stake", () => {
    const game = useGame.getState();
    game.setSelectedStake("red");
    game.setBlind(1);
    game.handleWin({ interest: 0, interestWallet: 0 });
    const hasSmallBlindReward = useGame
      .getState()
      .scoringEvents.some(
        (e) => e.kind === "money-delta" && e.source === "Small Blind reward",
      );
    expect(hasSmallBlindReward).toBe(false);
  });

  test("handleWin logs Big Blind reward event on Red Stake (negative)", () => {
    const game = useGame.getState();
    game.setSelectedStake("red");
    game.setBlind(2);
    game.handleWin({ interest: 0, interestWallet: 0 });
    const hasBigBlindReward = useGame
      .getState()
      .scoringEvents.some(
        (e) => e.kind === "money-delta" && e.source === "Big Blind reward",
      );
    expect(hasBigBlindReward).toBe(true);
  });

  test("handleWin records the defeated boss when the ante advances", () => {
    const game = useGame.getState();
    const defeatedId = game.currentBoss.id;
    game.setBlind(3);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().recentBossIds.has(defeatedId)).toBe(true);
  });

  test("handleWin generates a fresh shop", () => {
    useGame.getState().handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().shopOffers).not.toBeNull();
  });

  test("handleWin clears jokers sold during the prior shop visit", () => {
    const game = useGame.getState();
    game.setSoldJokerIdsThisShopVisit(["abc"]);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().soldJokerIdsThisShopVisit).toHaveLength(0);
  });

  test("handleWin refills the deck pile with the full deck", () => {
    useGame.getState().handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().dealt.remaining).toHaveLength(52);
  });

  test("handleWin leaves the dealt hand empty", () => {
    useGame.getState().handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().dealt.hand).toHaveLength(0);
  });

  test("handleWin logs a money-delta scoring event for the reward", () => {
    useGame.getState().handleWin({ interest: 0, interestWallet: 0 });
    const hasReward = useGame
      .getState()
      .scoringEvents.some((e) => e.kind === "money-delta" && e.amount === 3);
    expect(hasReward).toBe(true);
  });

  test("applySpectralEffect immolate destroys the requested cards", () => {
    const game = useGame.getState();
    game.setDealt({ hand: createDeck().slice(0, 5), remaining: [] });
    game.applySpectralEffect({ kind: "immolate", destroyCount: 2, moneyGain: 0 });
    expect(useGame.getState().dealt.hand).toHaveLength(3);
  });

  test("applySpectralEffect immolate adds the money gain", () => {
    const game = useGame.getState();
    game.setDealt({ hand: createDeck().slice(0, 5), remaining: [] });
    game.setMoney(0);
    game.applySpectralEffect({ kind: "immolate", destroyCount: 1, moneyGain: 4 });
    expect(useGame.getState().money).toBe(4);
  });

  test("applySpectralEffect immolate persists destroyed ids in destroyedCardIds", () => {
    const game = useGame.getState();
    game.setDealt({ hand: createDeck().slice(0, 5), remaining: [] });
    game.applySpectralEffect({ kind: "immolate", destroyCount: 2, moneyGain: 0 });
    expect(useGame.getState().destroyedCardIds.size).toBe(2);
  });

  test("applySpectralEffect transmute persists the destroyed id in destroyedCardIds", () => {
    const game = useGame.getState();
    game.setDealt({ hand: createDeck().slice(0, 5), remaining: [] });
    game.applySpectralEffect({ kind: "transmute", rankFilter: "face", addCount: 3 });
    expect(useGame.getState().destroyedCardIds.size).toBe(1);
  });

  test("applySpectralEffect transmute pushes the created cards to addedCards", () => {
    const game = useGame.getState();
    game.setDealt({ hand: createDeck().slice(0, 5), remaining: [] });
    game.applySpectralEffect({ kind: "transmute", rankFilter: "face", addCount: 3 });
    expect(useGame.getState().addedCards).toHaveLength(3);
  });

  test("applySpectralEffect sigil converts the hand to one suit", () => {
    const game = useGame.getState();
    game.setDealt({ hand: createDeck().slice(0, 5), remaining: [] });
    game.applySpectralEffect({ kind: "sigil" });
    const suits = new Set(useGame.getState().dealt.hand.map((c) => c.suit));
    expect(suits.size).toBe(1);
  });

  test("applySpectralEffect ouija converts the hand to one rank", () => {
    const game = useGame.getState();
    game.setDealt({ hand: createDeck().slice(0, 5), remaining: [] });
    game.applySpectralEffect({ kind: "ouija", handSizeDelta: -1 });
    const ranks = new Set(useGame.getState().dealt.hand.map((c) => c.rank));
    expect(ranks.size).toBe(1);
  });

  test("applySpectralEffect ouija applies the hand-size delta", () => {
    useGame.getState().applySpectralEffect({ kind: "ouija", handSizeDelta: -1 });
    expect(useGame.getState().handSizeModifier).toBe(-1);
  });

  describe("sigil/ouija conversions persist across deals", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    function seedHandFromBaseDeck(count: number) {
      const game = useGame.getState();
      const base = createDeck();
      game.setBaseDeckCards(base);
      const hand = base.slice(0, count);
      game.setDealt({ hand, remaining: base.slice(count) });
      return hand;
    }

    test("sigil registers replaced originals as destroyed and adds converted copies", () => {
      // 0.25 picks SUITS[1] (hearts); the seeded hand is all spades.
      vi.spyOn(Math, "random").mockReturnValue(0.25);
      const hand = seedHandFromBaseDeck(5);
      useGame.getState().applySpectralEffect({ kind: "sigil" });
      const st = useGame.getState();
      expect([...st.destroyedCardIds].sort()).toEqual(
        hand.map((c) => c.id).sort(),
      );
      expect(st.addedCards).toHaveLength(hand.length);
      expect(st.addedCards.every((c) => c.suit === "hearts")).toBe(true);
    });

    test("sigil keeps already-matching cards' ids (negative)", () => {
      // 0 picks SUITS[0] (spades); the seeded hand is already all spades.
      vi.spyOn(Math, "random").mockReturnValue(0);
      const hand = seedHandFromBaseDeck(5);
      useGame.getState().applySpectralEffect({ kind: "sigil" });
      const st = useGame.getState();
      expect(st.destroyedCardIds.size).toBe(0);
      expect(st.addedCards).toHaveLength(0);
      expect(st.dealt.hand.map((c) => c.id)).toEqual(hand.map((c) => c.id));
    });

    test("a sigil-converted card appears in the next built deck and its original does not", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.25);
      const hand = seedHandFromBaseDeck(5);
      const converted = hand[0];
      useGame.getState().applySpectralEffect({ kind: "sigil" });
      vi.restoreAllMocks();
      const st = useGame.getState();
      const rebuilt = buildShuffledDeck(
        st.baseDeckCards,
        st.destroyedCardIds,
        st.addedCards,
        st.cardEnhancementsById,
        st.cardSealsById,
        st.cardEditionsById,
      );
      expect(rebuilt.some((c) => c.id === converted.id)).toBe(false);
      const replacement = st.addedCards.find((c) => c.rank === converted.rank);
      expect(replacement).toBeDefined();
      expect(rebuilt.some((c) => c.id === replacement?.id)).toBe(true);
    });

    test("sigil remaps the current selection onto the replacement ids", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.25);
      const hand = seedHandFromBaseDeck(5);
      const converted = hand[0];
      useGame.getState().setSelectedIds(new Set([converted.id]));
      useGame.getState().applySpectralEffect({ kind: "sigil" });
      const st = useGame.getState();
      expect(st.selectedIds.size).toBe(1);
      const [selectedId] = [...st.selectedIds];
      expect(selectedId).not.toBe(converted.id);
      expect(st.dealt.hand.some((c) => c.id === selectedId)).toBe(true);
    });

    test("ouija registers replaced originals as destroyed and adds converted copies", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);
      const hand = seedHandFromBaseDeck(5);
      const nonTwos = hand.filter((c) => c.rank !== "2");
      useGame.getState().applySpectralEffect({ kind: "ouija", handSizeDelta: -1 });
      const st = useGame.getState();
      expect([...st.destroyedCardIds].sort()).toEqual(
        nonTwos.map((c) => c.id).sort(),
      );
      expect(st.addedCards.every((c) => c.rank === "2")).toBe(true);
    });

    test("ouija preserves each replaced card's suit on the re-added copy", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);
      const hand = seedHandFromBaseDeck(5);
      useGame.getState().applySpectralEffect({ kind: "ouija", handSizeDelta: -1 });
      const st = useGame.getState();
      const suitsBefore = hand.map((c) => c.suit);
      const suitsAfter = st.dealt.hand.map((c) => c.suit);
      expect(suitsAfter).toEqual(suitsBefore);
    });

    test("cards not in hand when sigil was used are unchanged (negative)", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.25);
      seedHandFromBaseDeck(5);
      const st0 = useGame.getState();
      const outsideIds = st0.dealt.remaining.map((c) => c.id);
      useGame.getState().applySpectralEffect({ kind: "sigil" });
      const st = useGame.getState();
      for (const id of outsideIds) {
        expect(st.destroyedCardIds.has(id)).toBe(false);
      }
    });
  });

  test("applySpectralEffect create-joker-by-rarity adds a joker", () => {
    const game = useGame.getState();
    game.setJokers([]);
    game.applySpectralEffect({
      kind: "create-joker-by-rarity",
      rarity: "common",
      setMoneyToZero: false,
    });
    expect(useGame.getState().jokers.length).toBeGreaterThan(0);
  });

  test("applySpectralEffect create-joker-by-rarity can zero the wallet", () => {
    const game = useGame.getState();
    game.setJokers([]);
    game.setMoney(50);
    game.applySpectralEffect({
      kind: "create-joker-by-rarity",
      rarity: "common",
      setMoneyToZero: true,
    });
    expect(useGame.getState().money).toBe(0);
  });

  test("applySpectralEffect ectoplasm applies the hand-size delta", () => {
    const game = useGame.getState();
    game.setJokers([createJokerCatalog()[0]]);
    game.applySpectralEffect({ kind: "ectoplasm", handSizeDelta: -1 });
    expect(useGame.getState().handSizeModifier).toBe(-1);
  });

  test("applySpectralEffect create-legendary adds a joker", () => {
    const game = useGame.getState();
    game.setJokers([]);
    game.applySpectralEffect({ kind: "create-legendary" });
    expect(useGame.getState().jokers).toHaveLength(1);
  });

  test("applySpectralEffect apply-seal is a no-op on the hand (negative)", () => {
    const game = useGame.getState();
    game.setDealt({ hand: createDeck().slice(0, 5), remaining: [] });
    game.applySpectralEffect({ kind: "apply-seal", seal: "gold", maxTargets: 1 });
    expect(useGame.getState().dealt.hand).toHaveLength(5);
  });

  test("applySpectralEffect hex leaves a single joker behind", () => {
    const [a, b, c] = createJokerCatalog();
    useGame.getState().setJokers([a, b, c]);
    useGame.getState().applySpectralEffect({ kind: "hex" });
    expect(useGame.getState().jokers).toHaveLength(1);
  });

  test("applySpectralEffect hex marks the surviving joker as polychrome", () => {
    const [a, b] = createJokerCatalog();
    useGame.getState().setJokers([a, b]);
    useGame.getState().applySpectralEffect({ kind: "hex" });
    expect(useGame.getState().jokers[0]?.edition).toBe("polychrome");
  });

  test("applySpectralEffect hex is a no-op when no jokers are equipped (negative)", () => {
    useGame.getState().setJokers([]);
    useGame.getState().applySpectralEffect({ kind: "hex" });
    expect(useGame.getState().jokers).toEqual([]);
  });

  test("applySpectralEffect ankh leaves two jokers behind", () => {
    const [a, b, c] = createJokerCatalog();
    useGame.getState().setJokers([a, b, c]);
    useGame.getState().applySpectralEffect({ kind: "ankh" });
    expect(useGame.getState().jokers).toHaveLength(2);
  });

  test("applySpectralEffect ankh leaves two jokers sharing the same id", () => {
    const [a, b] = createJokerCatalog();
    useGame.getState().setJokers([a, b]);
    useGame.getState().applySpectralEffect({ kind: "ankh" });
    const jokers = useGame.getState().jokers;
    expect(new Set(jokers.map((j) => j.id)).size).toBe(1);
  });

  test("applySpectralEffect ankh is a no-op when no jokers are equipped (negative)", () => {
    useGame.getState().setJokers([]);
    useGame.getState().applySpectralEffect({ kind: "ankh" });
    expect(useGame.getState().jokers).toEqual([]);
  });

  test("applySpectralEffect hex preserves an Eternal joker", () => {
    const [a, b] = createJokerCatalog();
    const eternalA = { ...a, stickers: [{ kind: "eternal" as const }] };
    useGame.getState().setJokers([eternalA, b]);
    useGame.getState().applySpectralEffect({ kind: "hex" });
    const ids = useGame.getState().jokers.map((j) => j.id).sort();
    expect(ids).toEqual([a.id, b.id].sort());
  });

  test("applySpectralEffect hex does not grant Polychrome to an Eternal joker", () => {
    const [a, b] = createJokerCatalog();
    const eternalA = { ...a, stickers: [{ kind: "eternal" as const }] };
    useGame.getState().setJokers([eternalA, b]);
    useGame.getState().applySpectralEffect({ kind: "hex" });
    const eternal = useGame.getState().jokers.find((j) => j.id === a.id);
    expect(eternal?.edition).toBeUndefined();
  });

  test("applySpectralEffect hex on an all-Eternal slate is a no-op (negative)", () => {
    const [a, b] = createJokerCatalog();
    const eternalA = { ...a, stickers: [{ kind: "eternal" as const }] };
    const eternalB = { ...b, stickers: [{ kind: "eternal" as const }] };
    useGame.getState().setJokers([eternalA, eternalB]);
    useGame.getState().applySpectralEffect({ kind: "hex" });
    expect(useGame.getState().jokers.map((j) => j.id)).toEqual([a.id, b.id]);
  });

  test("applySpectralEffect ankh preserves an Eternal joker alongside the copied pair", () => {
    const [a, b] = createJokerCatalog();
    const eternalA = { ...a, stickers: [{ kind: "eternal" as const }] };
    useGame.getState().setJokers([eternalA, b]);
    useGame.getState().applySpectralEffect({ kind: "ankh" });
    expect(useGame.getState().jokers).toHaveLength(3);
  });

  test("applySpectralEffect ankh does not copy an Eternal joker", () => {
    const [a, b] = createJokerCatalog();
    const eternalA = { ...a, stickers: [{ kind: "eternal" as const }] };
    useGame.getState().setJokers([eternalA, b]);
    useGame.getState().applySpectralEffect({ kind: "ankh" });
    const matches = useGame.getState().jokers.filter((j) => j.id === a.id);
    expect(matches).toHaveLength(1);
  });

  test("applySpectralEffect ankh on an all-Eternal slate is a no-op (negative)", () => {
    const [a, b] = createJokerCatalog();
    const eternalA = { ...a, stickers: [{ kind: "eternal" as const }] };
    const eternalB = { ...b, stickers: [{ kind: "eternal" as const }] };
    useGame.getState().setJokers([eternalA, eternalB]);
    useGame.getState().applySpectralEffect({ kind: "ankh" });
    expect(useGame.getState().jokers.map((j) => j.id)).toEqual([a.id, b.id]);
  });

  test("applyEnhancementToSelectedPreviewCards enhances the selected card", () => {
    const preview = createDeck().slice(0, 3);
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id]));
    game.applyEnhancementToSelectedPreviewCards("gold");
    const card = useGame
      .getState()
      .packPreviewHand.find((c) => c.id === preview[0].id);
    expect(card?.enhancement).toBe("gold");
  });

  test("applyEnhancementToSelectedPreviewCards leaves unselected cards alone (negative)", () => {
    const preview = createDeck().slice(0, 3);
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id]));
    game.applyEnhancementToSelectedPreviewCards("gold");
    const other = useGame
      .getState()
      .packPreviewHand.find((c) => c.id === preview[1].id);
    expect(other?.enhancement).toBeUndefined();
  });

  test("applyEnhancementToSelectedPreviewCards records the override by id", () => {
    const preview = createDeck().slice(0, 1);
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id]));
    game.applyEnhancementToSelectedPreviewCards("gold");
    expect(useGame.getState().cardEnhancementsById.get(preview[0].id)).toBe(
      "gold",
    );
  });

  test("applyEnhancementToSelectedPreviewCards clears the selection", () => {
    const preview = createDeck().slice(0, 1);
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id]));
    game.applyEnhancementToSelectedPreviewCards("gold");
    expect(useGame.getState().packPreviewSelectedIds.size).toBe(0);
  });

  test("applySealToSelectedPreviewCards seals the selected card", () => {
    const preview = createDeck().slice(0, 3);
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id]));
    game.applySealToSelectedPreviewCards("red");
    const card = useGame
      .getState()
      .packPreviewHand.find((c) => c.id === preview[0].id);
    expect(card?.seal).toBe("red");
  });

  test("applySealToSelectedPreviewCards records the override by id", () => {
    const preview = createDeck().slice(0, 1);
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id]));
    game.applySealToSelectedPreviewCards("red");
    expect(useGame.getState().cardSealsById.get(preview[0].id)).toBe("red");
  });

  test("duplicateSelectedPreviewCards adds the requested number of duplicates to addedCards", () => {
    const preview = createDeck().slice(0, 3);
    const game = useGame.getState();
    game.setAddedCards([]);
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id]));
    game.duplicateSelectedPreviewCards(2);
    expect(useGame.getState().addedCards).toHaveLength(2);
  });

  test("duplicateSelectedPreviewCards copies the selected card's rank and suit", () => {
    const preview = createDeck().slice(0, 3);
    const game = useGame.getState();
    game.setAddedCards([]);
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id]));
    game.duplicateSelectedPreviewCards(2);
    const added = useGame.getState().addedCards;
    expect(added.every((c) => c.rank === preview[0].rank && c.suit === preview[0].suit)).toBe(
      true,
    );
  });

  test("duplicateSelectedPreviewCards mints fresh card ids for each duplicate", () => {
    const preview = createDeck().slice(0, 3);
    const game = useGame.getState();
    game.setAddedCards([]);
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id]));
    game.duplicateSelectedPreviewCards(2);
    const added = useGame.getState().addedCards;
    const ids = new Set(added.map((c) => c.id));
    expect(ids.size).toBe(added.length);
  });

  test("duplicateSelectedPreviewCards appends the duplicates to the preview hand", () => {
    const preview = createDeck().slice(0, 3);
    const game = useGame.getState();
    game.setAddedCards([]);
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id]));
    game.duplicateSelectedPreviewCards(2);
    expect(useGame.getState().packPreviewHand).toHaveLength(preview.length + 2);
  });

  test("duplicateSelectedPreviewCards clears the preview selection", () => {
    const preview = createDeck().slice(0, 3);
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id]));
    game.duplicateSelectedPreviewCards(2);
    expect(useGame.getState().packPreviewSelectedIds.size).toBe(0);
  });

  test("duplicateSelectedPreviewCards is a no-op when nothing is selected (negative)", () => {
    const preview = createDeck().slice(0, 3);
    const game = useGame.getState();
    game.setAddedCards([]);
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set());
    game.duplicateSelectedPreviewCards(2);
    expect(useGame.getState().addedCards).toEqual([]);
  });

  test("duplicateSelectedPreviewCards is a no-op when copies is zero (negative)", () => {
    const preview = createDeck().slice(0, 3);
    const game = useGame.getState();
    game.setAddedCards([]);
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id]));
    game.duplicateSelectedPreviewCards(0);
    expect(useGame.getState().addedCards).toEqual([]);
  });

  test("toggleCard adds the card id to selectedIds", () => {
    const hand = createDeck().slice(0, 5);
    const game = useGame.getState();
    game.setDealt({ hand, remaining: [] });
    game.toggleCard(hand[0]);
    expect(useGame.getState().selectedIds.has(hand[0].id)).toBe(true);
  });

  test("toggleCard removes a previously selected card", () => {
    const hand = createDeck().slice(0, 5);
    const game = useGame.getState();
    game.setDealt({ hand, remaining: [] });
    game.toggleCard(hand[0]);
    game.toggleCard(hand[0]);
    expect(useGame.getState().selectedIds.has(hand[0].id)).toBe(false);
  });

  test("toggleCard clears the selected hand once the selection is empty", () => {
    const hand = createDeck().slice(0, 5);
    const game = useGame.getState();
    game.setDealt({ hand, remaining: [] });
    game.toggleCard(hand[0]);
    game.toggleCard(hand[0]);
    expect(useGame.getState().selectedHand).toBeNull();
  });

  test("toggleCard clears chips and multiplier once the selection is empty", () => {
    const hand = createDeck().slice(0, 5);
    const game = useGame.getState();
    game.setDealt({ hand, remaining: [] });
    game.toggleCard(hand[0]);
    game.toggleCard(hand[0]);
    const state = useGame.getState();
    expect([state.chips, state.multiplier]).toEqual([0, 0]);
  });

  test("toggleCard caps selection at MAX_SELECTED (negative)", () => {
    const hand = createDeck().slice(0, 6);
    const game = useGame.getState();
    game.setDealt({ hand, remaining: [] });
    for (let i = 0; i < 5; i += 1) game.toggleCard(hand[i]);
    game.toggleCard(hand[5]);
    expect(useGame.getState().selectedIds.has(hand[5].id)).toBe(false);
  });

  test("toggleCard is a no-op while cards are being discarded (negative)", () => {
    const hand = createDeck().slice(0, 5);
    const game = useGame.getState();
    game.setDealt({ hand, remaining: [] });
    game.setDiscardingIds(new Set([hand[1].id]));
    game.toggleCard(hand[0]);
    expect(useGame.getState().selectedIds.has(hand[0].id)).toBe(false);
  });

  test("toggleCard is a no-op while a scoring sequence is running (negative)", () => {
    const hand = createDeck().slice(0, 5);
    const game = useGame.getState();
    game.setDealt({ hand, remaining: [] });
    game.setScoringCards([hand[0]]);
    game.setScoringIndex(0);
    game.toggleCard(hand[1]);
    expect(useGame.getState().selectedIds.has(hand[1].id)).toBe(false);
  });

  test("toggleCard populates the selected hand label for a pair", () => {
    const hand = createDeck()
      .filter((c) => c.rank === "5")
      .slice(0, 2);
    const game = useGame.getState();
    game.setDealt({ hand, remaining: [] });
    game.toggleCard(hand[0]);
    game.toggleCard(hand[1]);
    expect(useGame.getState().selectedHand?.label).toBe("Pair");
  });

  test("toggleCard does not leak label when only face-down cards are selected", () => {
    const base = createDeck()
      .filter((c) => c.rank === "5")
      .slice(0, 2);
    const hand = base.map((c) => ({ ...c, faceDown: true }));
    const game = useGame.getState();
    game.setDealt({ hand, remaining: [] });
    game.toggleCard(hand[0]);
    game.toggleCard(hand[1]);
    expect(useGame.getState().selectedHand).toBeNull();
  });

  test("toggleCard zeroes chips and mult when only face-down cards are selected", () => {
    const base = createDeck()
      .filter((c) => c.rank === "5")
      .slice(0, 2);
    const hand = base.map((c) => ({ ...c, faceDown: true }));
    const game = useGame.getState();
    game.setDealt({ hand, remaining: [] });
    game.toggleCard(hand[0]);
    game.toggleCard(hand[1]);
    const state = useGame.getState();
    expect([state.chips, state.multiplier]).toEqual([0, 0]);
  });

  test("toggleCard does not preview Pair when a face-down card would complete it", () => {
    const fives = createDeck()
      .filter((c) => c.rank === "5")
      .slice(0, 1);
    const seven = createDeck().find((c) => c.rank === "7");
    if (!seven) throw new Error("expected a 7 in the base deck");
    const hand = [{ ...fives[0], faceDown: true }, seven];
    const game = useGame.getState();
    game.setDealt({ hand, remaining: [] });
    game.toggleCard(hand[0]);
    game.toggleCard(hand[1]);
    expect(useGame.getState().selectedHand?.label).toBe("High Card");
  });

  test("toggleCard still previews Pair when two face-up cards match (regression)", () => {
    const hand = createDeck()
      .filter((c) => c.rank === "5")
      .slice(0, 2);
    const game = useGame.getState();
    game.setDealt({ hand, remaining: [] });
    game.toggleCard(hand[0]);
    game.toggleCard(hand[1]);
    expect(useGame.getState().selectedHand?.label).toBe("Pair");
  });

  test("toggleCard previews label using only face-up cards when mixed with face-down", () => {
    const fives = createDeck()
      .filter((c) => c.rank === "5")
      .slice(0, 2);
    const seven = createDeck().find((c) => c.rank === "7");
    if (!seven) throw new Error("expected a 7 in the base deck");
    const hand = [fives[0], fives[1], { ...seven, faceDown: true }];
    const game = useGame.getState();
    game.setDealt({ hand, remaining: [] });
    game.toggleCard(hand[0]);
    game.toggleCard(hand[1]);
    game.toggleCard(hand[2]);
    expect(useGame.getState().selectedHand?.label).toBe("Pair");
  });

  test("toggleCard hides preview after The House flips initial hand face-down", () => {
    const house = createBossCatalog().find((b) => b.id === "the-house");
    if (!house) throw new Error("expected The House in the boss catalog");
    const fives = createDeck()
      .filter((c) => c.rank === "5")
      .slice(0, 2);
    const hand = applyBossFaceDown(fives, house, true, "initial");
    const game = useGame.getState();
    game.setBlind(3);
    game.setCurrentBoss(house);
    game.setDealt({ hand, remaining: [] });
    game.toggleCard(hand[0]);
    game.toggleCard(hand[1]);
    expect(useGame.getState().selectedHand).toBeNull();
  });

  test("toggleCard halves chips on blind 3 against The Flint", () => {
    const hand = createDeck()
      .filter((c) => c.rank === "5")
      .slice(0, 2);
    const game = useGame.getState();
    game.setDealt({ hand, remaining: [] });
    game.setBlind(3);
    const flint = {
      id: "the-flint",
      name: "The Flint",
      description: "Base Chips and Mult for played hands are halved.",
      scoreMultiplier: 2,
      anteMin: 2,
      effect: {
        kind: "hand-stats-multiplier" as const,
        chipsFactor: 0.5,
        multFactor: 0.5,
      },
    };
    game.setCurrentBoss(flint);
    const baseChips = game.handStats["Pair"].chips;
    game.toggleCard(hand[0]);
    game.toggleCard(hand[1]);
    expect(useGame.getState().chips).toBe(Math.floor(baseChips * 0.5));
  });

  test("adjustVoucherSlots grows the row by appending fresh picks", () => {
    const [first] = VOUCHER_CATALOG;
    const game = useGame.getState();
    game.setExtraVoucherSlots(0);
    game.setCurrentAnteVouchers([first]);
    game.adjustVoucherSlots(2);
    expect(useGame.getState().currentAnteVouchers.length).toBe(
      BASE_VOUCHER_SLOTS + 2,
    );
  });

  test("adjustVoucherSlots preserves existing vouchers when growing", () => {
    const [first] = VOUCHER_CATALOG;
    const game = useGame.getState();
    game.setExtraVoucherSlots(0);
    game.setCurrentAnteVouchers([first]);
    game.adjustVoucherSlots(1);
    expect(useGame.getState().currentAnteVouchers[0].id).toBe(first.id);
  });

  test("adjustVoucherSlots shrinks the row by slicing", () => {
    const [a, b, c] = VOUCHER_CATALOG;
    const game = useGame.getState();
    game.setExtraVoucherSlots(2);
    game.setCurrentAnteVouchers([a, b, c]);
    game.adjustVoucherSlots(-1);
    expect(useGame.getState().currentAnteVouchers.map((v) => v.id)).toEqual([
      a.id,
      b.id,
    ]);
  });

  test("adjustVoucherSlots empties the row when nextCount is zero", () => {
    const [a] = VOUCHER_CATALOG;
    const game = useGame.getState();
    game.setExtraVoucherSlots(0);
    game.setCurrentAnteVouchers([a]);
    game.adjustVoucherSlots(-1);
    expect(useGame.getState().currentAnteVouchers).toEqual([]);
  });

  test("adjustVoucherSlots updates extraVoucherSlots when growing", () => {
    const game = useGame.getState();
    game.setExtraVoucherSlots(0);
    game.adjustVoucherSlots(3);
    expect(useGame.getState().extraVoucherSlots).toBe(3);
  });

  test("adjustVoucherSlots clamps shrink at -BASE_VOUCHER_SLOTS (negative)", () => {
    const game = useGame.getState();
    game.setExtraVoucherSlots(-BASE_VOUCHER_SLOTS);
    game.adjustVoucherSlots(-1);
    expect(useGame.getState().extraVoucherSlots).toBe(-BASE_VOUCHER_SLOTS);
  });

  test("adjustVoucherSlots is a no-op when the delta keeps extraVoucherSlots unchanged (negative)", () => {
    const [a] = VOUCHER_CATALOG;
    const game = useGame.getState();
    game.setExtraVoucherSlots(-BASE_VOUCHER_SLOTS);
    game.setCurrentAnteVouchers([a]);
    game.adjustVoucherSlots(-5);
    expect(useGame.getState().currentAnteVouchers).toEqual([a]);
  });

  test("adjustVoucherSlots excludes already-on-shelf vouchers from new picks", () => {
    const [a] = VOUCHER_CATALOG;
    const game = useGame.getState();
    game.setExtraVoucherSlots(0);
    game.setCurrentAnteVouchers([a]);
    game.adjustVoucherSlots(2);
    const ids = useGame.getState().currentAnteVouchers.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("pending shop modifiers", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
    shopPickerRngConfig.rng = forceShopLayout(["planet", "tarot"]);
  });

  test("handleWin injects a Negative joker when the shop rolls no joker", () => {
    const game = useGame.getState();
    game.setPendingShopMods([{ kind: "free-edition-joker", edition: "negative" }]);
    game.handleWin({ interest: 0, interestWallet: 0 });
    const editioned = useGame
      .getState()
      .shopOffers?.find((o) => o.kind === "joker" && o.joker.edition === "negative");
    expect(editioned).toBeDefined();
  });

  test("the injected Negative joker is free", () => {
    const game = useGame.getState();
    game.setPendingShopMods([{ kind: "free-edition-joker", edition: "negative" }]);
    game.handleWin({ interest: 0, interestWallet: 0 });
    const editioned = useGame
      .getState()
      .shopOffers?.find((o) => o.kind === "joker" && o.joker.edition === "negative");
    expect(editioned?.price).toBe(0);
  });

  test("handleWin does not inject a joker when no edition tag is queued (negative)", () => {
    useGame.getState().handleWin({ interest: 0, interestWallet: 0 });
    const editioned = useGame
      .getState()
      .shopOffers?.find((o) => o.kind === "joker" && o.joker.edition !== undefined);
    expect(editioned).toBeUndefined();
  });

  test("Coupon Tag keeps item offers free after a reroll", () => {
    const game = useGame.getState();
    game.setPendingShopMods([{ kind: "free-shop-items" }]);
    game.setMoney(100);
    game.handleWin({ interest: 0, interestWallet: 0 });
    shopPickerRngConfig.rng = forceShopLayout(["planet", "tarot"]);
    useGame.getState().rerollShopOffers(5);
    const items = useGame
      .getState()
      .shopOffers?.filter((o) => o.kind !== "pack") ?? [];
    expect(items.every((o) => o.price === 0)).toBe(true);
  });

  test("rerolled item offers are priced normally when no Coupon Tag is queued (negative)", () => {
    const game = useGame.getState();
    game.setMoney(100);
    game.handleWin({ interest: 0, interestWallet: 0 });
    shopPickerRngConfig.rng = forceShopLayout(["planet", "tarot"]);
    useGame.getState().rerollShopOffers(5);
    const items = useGame
      .getState()
      .shopOffers?.filter((o) => o.kind !== "pack") ?? [];
    expect(items.every((o) => o.price > 0)).toBe(true);
  });
});

describe("enhancement-gated jokers", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
    shopPickerRngConfig.rng = forceShopLayout(["joker", "joker"]);
  });

  function ownAllJokersExcept(ids: ReadonlyArray<string>): void {
    const owned = createJokerCatalog()
      .filter((j) => !ids.includes(j.id))
      // Showman lets owned jokers reappear as duplicate offers, which would
      // defeat the "own everything to exclude everything" isolation these gate
      // tests rely on. Keep it owned (so it stays out of the offer pool) but
      // inactive (expired perishable) so it grants no duplicate allowance.
      .map((j) =>
        j.effect.kind === "allows-duplicate-jokers"
          ? { ...j, stickers: [{ kind: "perishable", roundsHeld: PERISHABLE_LIFE } as const] }
          : j,
      );
    useGame.getState().setJokers(owned);
  }

  function offeredJokerIds(): string[] {
    return (useGame.getState().shopOffers ?? []).flatMap((o) =>
      o.kind === "joker" ? [o.joker.id] : [],
    );
  }

  test("the shop offers no joker when only gated jokers remain and no matching cards are owned", () => {
    ownAllJokersExcept(["stone-joker", "steel-joker"]);
    useGame.getState().handleWin({ interest: 0, interestWallet: 0 });
    expect(offeredJokerIds()).toHaveLength(0);
  });

  test("Stone Joker can appear once a base card is enhanced to Stone", () => {
    ownAllJokersExcept(["stone-joker"]);
    const game = useGame.getState();
    game.setCardEnhancementsById(
      new Map([[game.baseDeckCards[0].id, "stone" as const]]),
    );
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(offeredJokerIds()).toContain("stone-joker");
  });

  test("Steel Joker can appear once a Steel card is added to the deck", () => {
    ownAllJokersExcept(["steel-joker"]);
    const game = useGame.getState();
    game.setAddedCards([
      { id: 999, rank: "A", suit: "spades", enhancement: "steel" },
    ]);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(offeredJokerIds()).toContain("steel-joker");
  });

  test("a Steel card alone does not unlock Stone Joker (negative)", () => {
    ownAllJokersExcept(["stone-joker", "steel-joker"]);
    const game = useGame.getState();
    game.setAddedCards([
      { id: 999, rank: "A", suit: "spades", enhancement: "steel" },
    ]);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(offeredJokerIds()).toEqual(["steel-joker"]);
  });

  test("a reroll re-evaluates the gate after a Stone card joins mid-shop", () => {
    ownAllJokersExcept(["stone-joker"]);
    const game = useGame.getState();
    game.setMoney(100);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(offeredJokerIds()).toHaveLength(0);
    useGame
      .getState()
      .setCardEnhancementsById(
        new Map([[game.baseDeckCards[0].id, "stone" as const]]),
      );
    shopPickerRngConfig.rng = forceShopLayout(["joker", "joker"]);
    useGame.getState().rerollShopOffers(5);
    expect(offeredJokerIds()).toContain("stone-joker");
  });
});

describe("applyDeathCopyToSelectedPreviewCards", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("is a no-op when fewer than 2 cards are selected (negative)", () => {
    const preview = createDeck().slice(0, 3);
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id]));
    game.applyDeathCopyToSelectedPreviewCards();
    const same = useGame
      .getState()
      .packPreviewHand.find((c) => c.id === preview[0].id);
    expect(same).toEqual(preview[0]);
  });

  test("uses store packPreviewHand order when no display order is set: left becomes a copy of right", () => {
    const preview = createDeck().slice(0, 3);
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id, preview[1].id]));
    game.applyDeathCopyToSelectedPreviewCards();
    const left = useGame
      .getState()
      .packPreviewHand.find((c) => c.id === preview[0].id);
    expect(left?.rank).toBe(preview[1].rank);
  });

  test("preserves the left card's id after the copy (the new card replaces the old left in place)", () => {
    const preview = createDeck().slice(0, 3);
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id, preview[1].id]));
    game.applyDeathCopyToSelectedPreviewCards();
    const stillExists = useGame
      .getState()
      .packPreviewHand.find((c) => c.id === preview[0].id);
    expect(stillExists).toBeDefined();
  });

  test("respects packPreviewDisplayOrder: left/right follow the displayed arrangement", () => {
    const preview = createDeck().slice(0, 3);
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id, preview[1].id]));
    game.setPackPreviewDisplayOrder([preview[1].id, preview[0].id, preview[2].id]);
    game.applyDeathCopyToSelectedPreviewCards();
    const card1 = useGame
      .getState()
      .packPreviewHand.find((c) => c.id === preview[1].id);
    expect(card1?.rank).toBe(preview[0].rank);
  });

  test("clears the preview selection after applying", () => {
    const preview = createDeck().slice(0, 3);
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id, preview[1].id]));
    game.applyDeathCopyToSelectedPreviewCards();
    expect(useGame.getState().packPreviewSelectedIds.size).toBe(0);
  });

  test("leaves the unselected card untouched (negative)", () => {
    const preview = createDeck().slice(0, 3);
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id, preview[1].id]));
    game.applyDeathCopyToSelectedPreviewCards();
    const untouched = useGame
      .getState()
      .packPreviewHand.find((c) => c.id === preview[2].id);
    expect(untouched).toEqual(preview[2]);
  });
});

describe("destroySelectedPreviewCards", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("removes the selected preview card from packPreviewHand", () => {
    const preview = createDeck().slice(0, 3);
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id]));
    game.destroySelectedPreviewCards();
    expect(
      useGame.getState().packPreviewHand.some((c) => c.id === preview[0].id),
    ).toBe(false);
  });

  test("adds the destroyed id to destroyedCardIds (persists to deck)", () => {
    const preview = createDeck().slice(0, 2);
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id]));
    game.destroySelectedPreviewCards();
    expect(useGame.getState().destroyedCardIds.has(preview[0].id)).toBe(true);
  });

  test("clears packPreviewSelectedIds", () => {
    const preview = createDeck().slice(0, 1);
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id]));
    game.destroySelectedPreviewCards();
    expect(useGame.getState().packPreviewSelectedIds.size).toBe(0);
  });

  test("is a no-op when no preview card is selected (negative)", () => {
    const preview = createDeck().slice(0, 1);
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set());
    game.destroySelectedPreviewCards();
    expect(useGame.getState().packPreviewHand).toHaveLength(1);
  });
});

describe("rankUpSelectedPreviewCards", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("replaces the selected preview card with a rank-up version", () => {
    const preview = createDeck().slice(0, 1);
    const original = preview[0];
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([original.id]));
    game.rankUpSelectedPreviewCards();
    const newCard = useGame
      .getState()
      .packPreviewHand.find((c) => c.id !== original.id);
    expect(newCard?.suit).toBe(original.suit);
  });

  test("adds the original id to destroyedCardIds", () => {
    const preview = createDeck().slice(0, 1);
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id]));
    game.rankUpSelectedPreviewCards();
    expect(useGame.getState().destroyedCardIds.has(preview[0].id)).toBe(true);
  });

  test("appends the new card to addedCards (persists in deck)", () => {
    const preview = createDeck().slice(0, 1);
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id]));
    const before = useGame.getState().addedCards.length;
    game.rankUpSelectedPreviewCards();
    expect(useGame.getState().addedCards.length).toBe(before + 1);
  });

  test("clears packPreviewSelectedIds", () => {
    const preview = createDeck().slice(0, 1);
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id]));
    game.rankUpSelectedPreviewCards();
    expect(useGame.getState().packPreviewSelectedIds.size).toBe(0);
  });

  test("is a no-op when no preview card is selected (negative)", () => {
    const preview = createDeck().slice(0, 1);
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set());
    game.rankUpSelectedPreviewCards();
    expect(useGame.getState().packPreviewHand).toEqual(preview);
  });
});

describe("applyAuraSelectedPreviewCards", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("applies an edition to the selected preview card", () => {
    const preview = createDeck().slice(0, 1);
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id]));
    game.applyAuraSelectedPreviewCards();
    const card = useGame
      .getState()
      .packPreviewHand.find((c) => c.id === preview[0].id);
    expect(card?.edition).toBeDefined();
  });

  test("clears packPreviewSelectedIds", () => {
    const preview = createDeck().slice(0, 1);
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set([preview[0].id]));
    game.applyAuraSelectedPreviewCards();
    expect(useGame.getState().packPreviewSelectedIds.size).toBe(0);
  });

  test("is a no-op when no preview card is selected (negative)", () => {
    const preview = createDeck().slice(0, 1);
    const game = useGame.getState();
    game.setPackPreviewHand(preview);
    game.setPackPreviewSelectedIds(new Set());
    game.applyAuraSelectedPreviewCards();
    const card = useGame
      .getState()
      .packPreviewHand.find((c) => c.id === preview[0].id);
    expect(card?.edition).toBeUndefined();
  });
});
