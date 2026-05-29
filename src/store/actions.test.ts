import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "./game";
import { MAX_JOKERS, createJokerCatalog, jokerSellValue } from "../items/jokers";
import { createPlanetCatalog } from "../items/planets";
import { consumableSellValue, type Consumable } from "../items/consumables";
import { VOUCHER_CATALOG } from "../items/vouchers";
import { packPickLimit, type PackOffer } from "../items/packs";
import { createDeck } from "../cards/deck";

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
});
