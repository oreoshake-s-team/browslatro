import type { StateCreator } from "zustand";
import type { GameState } from "./game";
import { consumableSellValue, removeConsumableAt } from "../items/consumables";
import { createJokerCatalog, jokerSellValue } from "../items/jokers";
import {
  pickShopItemOffers,
  pickSingleShopOffer,
  shopPickerRngConfig,
} from "../items/shop";
import { availablePlanets, createPlanetCatalog } from "../items/planets";
import { createTarotCatalog } from "../items/tarots";
import { createSpectralCatalog } from "../items/spectrals";
import {
  extraShopOfferSlots,
  extraStartingDiscards,
  extraStartingHands,
} from "../items/vouchers";

export interface ActionsState {
  sellConsumable: (consumableIdx: number) => void;
  sellJoker: (jokerIdx: number) => void;
  reorderJokers: (orderedIds: ReadonlyArray<string>) => void;
  rerollShopOffers: (cost: number) => void;
  buyAnteVoucher: (voucherIdx: number) => void;
}

export const createActionsSlice: StateCreator<GameState, [], [], ActionsState> = (
  _set,
  get,
) => ({
  sellConsumable: (consumableIdx) => {
    const s = get();
    const entry = s.consumables[consumableIdx];
    if (!entry) return;
    s.earn(consumableSellValue(entry));
    s.setConsumables((prev) => removeConsumableAt(prev, consumableIdx));
  },
  sellJoker: (jokerIdx) => {
    const s = get();
    const entry = s.jokers[jokerIdx];
    if (!entry) return;
    s.earn(jokerSellValue(entry));
    s.setJokers((prev) => prev.filter((_, i) => i !== jokerIdx));
  },
  reorderJokers: (orderedIds) => {
    get().setJokers((prev) => {
      const byId = new Map(prev.map((j) => [j.id, j]));
      const ordered = orderedIds.flatMap((id) => byId.get(id) ?? []);
      const seen = new Set(orderedIds);
      return [...ordered, ...prev.filter((j) => !seen.has(j.id))];
    });
  },
  rerollShopOffers: (cost) => {
    const s = get();
    if (!s.shopOffers) return;
    if (s.money < cost) return;
    s.spend(cost);
    const freshItems = pickShopItemOffers({
      jokerCatalog: createJokerCatalog(),
      excludedJokerIds: [
        ...s.jokers.map((j) => j.id),
        ...s.soldJokerIdsThisShopVisit,
      ],
      planetCatalog: availablePlanets(createPlanetCatalog(), s.handPlayCounts),
      tarotCatalog: createTarotCatalog(),
      spectralCatalog: createSpectralCatalog(),
      extraSlots: extraShopOfferSlots(s.ownedVoucherIds),
      rng: shopPickerRngConfig.rng,
    });
    s.setShopOffers((current) => {
      if (!current) return current;
      const existingPacks = current.filter((o) => o.kind === "pack");
      return [...freshItems, ...existingPacks];
    });
  },
  buyAnteVoucher: (voucherIdx) => {
    const s = get();
    const voucher = s.currentAnteVouchers[voucherIdx];
    if (!voucher) return;
    if (s.soldVoucherIds.has(voucher.id)) return;
    if (s.money < voucher.cost) return;
    if (voucher.requires && !s.ownedVoucherIds.has(voucher.requires)) return;
    s.spend(voucher.cost);
    const nextOwnedVoucherIds = new Set(s.ownedVoucherIds);
    nextOwnedVoucherIds.add(voucher.id);
    const handGain =
      extraStartingHands(nextOwnedVoucherIds) -
      extraStartingHands(s.ownedVoucherIds);
    const discardGain =
      extraStartingDiscards(nextOwnedVoucherIds) -
      extraStartingDiscards(s.ownedVoucherIds);
    if (handGain > 0) s.setRemainingHands((prev) => prev + handGain);
    if (discardGain > 0) s.setRemainingDiscards((prev) => prev + discardGain);
    s.setOwnedVoucherIds(nextOwnedVoucherIds);
    s.setSoldVoucherIds((prev) => {
      const next = new Set(prev);
      next.add(voucher.id);
      return next;
    });
    if (voucher.id === "overstock" || voucher.id === "overstock-plus") {
      s.setShopOffers((current) => {
        if (!current) return current;
        const extra = pickSingleShopOffer(
          {
            jokerCatalog: createJokerCatalog(),
            excludedJokerIds: [
              ...s.jokers.map((j) => j.id),
              ...s.soldJokerIdsThisShopVisit,
            ],
            planetCatalog: availablePlanets(createPlanetCatalog(), s.handPlayCounts),
            tarotCatalog: createTarotCatalog(),
            spectralCatalog: createSpectralCatalog(),
            rng: shopPickerRngConfig.rng,
          },
          current,
        );
        return extra ? [...current, extra] : current;
      });
    }
  },
});
