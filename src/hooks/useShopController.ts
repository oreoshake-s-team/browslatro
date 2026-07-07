import { useCallback, useMemo } from "react";
import { useGame } from "../store/game";
import { consumableCapacityFor, jokerCapacityFor } from "../items/capacities";
import { applyNextShopModifiers } from "../run/nextShopMods";
import { recordShopFeedback } from "../ai/advisor/shownShopAdvice";
import { play } from "../components/system/sounds";
import { pruneTagsByCategory } from "../items/tags";
import {
  applyShopDiscount,
  VOUCHER_CATALOG,
} from "../items/vouchers";
import {
  effectiveJokerCount,
  hasChaosTheClownInJokers,
  shopExitConsumableCopies,
} from "../items/jokers";
import type { ShopProps } from "../components/shop/Shop";

export function useShopController(): ShopProps | undefined {
  const money = useGame((s) => s.money);
  const jokers = useGame((s) => s.jokers);
  const consumables = useGame((s) => s.consumables);
  const setConsumables = useGame((s) => s.setConsumables);
  const shopOffers = useGame((s) => s.shopOffers);
  const currentAnteVouchers = useGame((s) => s.currentAnteVouchers);
  const soldVoucherIds = useGame((s) => s.soldVoucherIds);
  const ownedVoucherIds = useGame((s) => s.ownedVoucherIds);
  const pendingShopMods = useGame((s) => s.pendingShopMods);
  const setPendingShopMods = useGame((s) => s.setPendingShopMods);
  const setPendingTags = useGame((s) => s.setPendingTags);
  const setPendingBlindSelect = useGame((s) => s.setPendingBlindSelect);
  const setShopOffers = useGame((s) => s.setShopOffers);
  const setSoldJokerIdsThisShopVisit = useGame(
    (s) => s.setSoldJokerIdsThisShopVisit,
  );
  const buyShopOfferAction = useGame((s) => s.buyShopOffer);
  const rerollShopOffersAction = useGame((s) => s.rerollShopOffers);
  const buyAnteVoucherAction = useGame((s) => s.buyAnteVoucher);
  const setCurrentAnteVouchers = useGame((s) => s.setCurrentAnteVouchers);

  const equippedJokerCount = effectiveJokerCount(jokers);
  const consumableCount = consumables.length;
  const selectedDeck = useGame((s) => s.selectedDeck);
  const consumableCapacity =
    consumableCapacityFor(ownedVoucherIds);
  const jokerCapacity = jokerCapacityFor(ownedVoucherIds, selectedDeck);
  const extraRerollReduction = useMemo(
    () => applyNextShopModifiers(pendingShopMods).rerollReduction,
    [pendingShopMods],
  );

  const onBuy = useCallback(
    (idx: number) => {
      const pre = useGame.getState();
      if (buyShopOfferAction(idx)) {
        play("pop");
        recordShopFeedback({ kind: "buy", offerIdx: idx }, pre);
      }
    },
    [buyShopOfferAction],
  );

  const onReroll = useCallback(
    (cost: number) => {
      if (!shopOffers) return;
      if (money < cost) return;
      const pre = useGame.getState();
      play("pop");
      rerollShopOffersAction(cost);
      recordShopFeedback({ kind: "reroll", cost }, pre);
    },
    [money, shopOffers, rerollShopOffersAction],
  );

  const onBuyVoucher = useCallback(
    (voucherIdx: number) => {
      const voucher = currentAnteVouchers[voucherIdx];
      if (!voucher) return;
      if (soldVoucherIds.has(voucher.id)) return;
      const price = applyShopDiscount(voucher.cost, ownedVoucherIds);
      if (money < price) return;
      if (voucher.requires && !ownedVoucherIds.has(voucher.requires)) return;
      const pre = useGame.getState();
      play("pop");
      buyAnteVoucherAction(voucherIdx);
      recordShopFeedback({ kind: "buy-voucher", voucherIdx }, pre);
    },
    [currentAnteVouchers, soldVoucherIds, ownedVoucherIds, money, buyAnteVoucherAction],
  );

  const onNext = useCallback(() => {
    recordShopFeedback({ kind: "leave" }, useGame.getState());
    const copies = shopExitConsumableCopies(jokers, useGame.getState().consumables);
    if (copies.length > 0) setConsumables((prev) => [...prev, ...copies]);
    setShopOffers(null);
    setSoldJokerIdsThisShopVisit([]);
    setPendingShopMods([]);
    setPendingTags((prev) => pruneTagsByCategory(prev, "next-shop"));
    setPendingBlindSelect(true);
  }, [jokers, setConsumables, setShopOffers, setSoldJokerIdsThisShopVisit, setPendingShopMods, setPendingTags, setPendingBlindSelect]);

  const onSetVoucher = useCallback((id: string) => {
    const next = VOUCHER_CATALOG.find((v) => v.id === id);
    if (next) setCurrentAnteVouchers([next]);
  }, [setCurrentAnteVouchers]);

  return useMemo<ShopProps | undefined>(() => {
    if (!shopOffers) return undefined;
    return {
      money,
      equippedJokerCount,
      jokerCapacity,
      consumableCount,
      consumableCapacity,
      offers: shopOffers,
      vouchers: currentAnteVouchers,
      soldVoucherIds,
      ownedVoucherIds,
      onBuy,
      onBuyVoucher,
      onReroll,
      onNext,
      extraRerollReduction,
      freeFirstReroll: hasChaosTheClownInJokers(jokers),
      // Expose dev wiring to pick voucher options when admin mode is on
      voucherOptions: VOUCHER_CATALOG,
      onSetVoucher,
    };
  }, [
    shopOffers,
    money,
    equippedJokerCount,
    consumableCount,
    consumableCapacity,
    jokerCapacity,
    currentAnteVouchers,
    soldVoucherIds,
    ownedVoucherIds,
    onBuy,
    onBuyVoucher,
    onReroll,
    onNext,
    extraRerollReduction,
    jokers,
    onSetVoucher,
  ]);
}
