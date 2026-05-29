import type { StateCreator } from "zustand";
import type { GameState } from "./game";
import {
  MAX_CONSUMABLE_SLOTS,
  addConsumable,
  consumableSellValue,
  hasFreeConsumableSlot,
  removeConsumableAt,
  type Consumable,
} from "../items/consumables";
import {
  MAX_JOKERS,
  createJokerCatalog,
  effectiveJokerCount,
  jokerSellValue,
} from "../items/jokers";
import {
  pickShopItemOffers,
  pickSingleShopOffer,
  shopPickerRngConfig,
} from "../items/shop";
import { availablePlanets, createPlanetCatalog } from "../items/planets";
import { createTarotCatalog } from "../items/tarots";
import { createSpectralCatalog } from "../items/spectrals";
import {
  applyShopDiscount,
  extraConsumableSlots,
  extraHandSize,
  extraJokerSlots,
  extraShopOfferSlots,
  extraStartingDiscards,
  extraStartingHands,
} from "../items/vouchers";
import { packPickLimit, type PackOffer } from "../items/packs";
import { createDeck, shuffle, HAND_SIZE } from "../cards/deck";
import { applyEnhancementOverrides, applySealOverrides } from "../cards/deckBuild";

export interface ActionsState {
  sellConsumable: (consumableIdx: number) => void;
  sellJoker: (jokerIdx: number) => void;
  reorderJokers: (orderedIds: ReadonlyArray<string>) => void;
  rerollShopOffers: (cost: number) => void;
  buyAnteVoucher: (voucherIdx: number) => void;
  markOfferSold: (idx: number) => void;
  openPackOffer: (pack: PackOffer) => void;
  openPack: (idx: number) => boolean;
  decrementPackPicks: () => void;
  closeOpenedPack: () => void;
  buyShopOffer: (idx: number) => boolean;
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
  markOfferSold: (idx) => {
    get().setShopOffers((current) =>
      current
        ? current.map((o, i) => (i === idx ? { ...o, sold: true } : o))
        : current,
    );
  },
  openPackOffer: (pack) => {
    const s = get();
    s.setOpenedPack(pack);
    s.setPackPicksRemaining(packPickLimit(pack.variant));
    if (pack.pool === "arcana" || pack.pool === "spectral") {
      const currentHandSize = Math.max(
        1,
        HAND_SIZE + s.handSizeModifier + extraHandSize(s.ownedVoucherIds),
      );
      const baseDeck = applySealOverrides(
        applyEnhancementOverrides(
          createDeck(s.destroyedCardKeys),
          s.cardEnhancementsByKey,
        ),
        s.cardSealsByKey,
      );
      const extras = applySealOverrides(
        applyEnhancementOverrides(s.addedCards, s.cardEnhancementsByKey),
        s.cardSealsByKey,
      );
      s.setPackPreviewHand(
        shuffle([...baseDeck, ...extras]).slice(0, currentHandSize),
      );
    } else {
      s.setPackPreviewHand([]);
    }
    s.setPackPreviewSelectedIds(new Set());
  },
  openPack: (idx) => {
    const s = get();
    const offer = s.shopOffers?.[idx];
    if (!offer || offer.sold || offer.kind !== "pack") return false;
    const price = applyShopDiscount(offer.price, s.ownedVoucherIds);
    if (s.money < price) return false;
    s.spend(price);
    s.openPackOffer(offer.pack);
    s.markOfferSold(idx);
    return true;
  },
  decrementPackPicks: () => {
    get().setPackPicksRemaining((prev) => {
      const remaining = prev - 1;
      if (remaining <= 0) {
        const s = get();
        s.setOpenedPack(null);
        s.setPackPreviewHand([]);
        s.setPackPreviewSelectedIds(new Set());
      }
      return remaining;
    });
  },
  closeOpenedPack: () => {
    const s = get();
    s.setOpenedPack(null);
    s.setPackPicksRemaining(0);
    s.setPackPreviewHand([]);
    s.setPackPreviewSelectedIds(new Set());
  },
  buyShopOffer: (idx) => {
    const s = get();
    const offer = s.shopOffers?.[idx];
    if (!offer || offer.sold) return false;
    if (offer.kind === "pack") {
      return s.openPack(idx);
    }
    const price = applyShopDiscount(offer.price, s.ownedVoucherIds);
    if (s.money < price) return false;
    if (offer.kind === "joker") {
      if (
        effectiveJokerCount(s.jokers) >=
        MAX_JOKERS + extraJokerSlots(s.ownedVoucherIds)
      ) {
        return false;
      }
      s.spend(price);
      s.setJokers((prev) => [...prev, offer.joker]);
      s.setSoldJokerIdsThisShopVisit((prev) => [...prev, offer.joker.id]);
      s.markOfferSold(idx);
      return true;
    }
    const consumableCapacity =
      MAX_CONSUMABLE_SLOTS + extraConsumableSlots(s.ownedVoucherIds);
    if (!hasFreeConsumableSlot(s.consumables, consumableCapacity)) return false;
    const next: Consumable =
      offer.kind === "planet"
        ? { kind: "planet", card: offer.planet }
        : offer.kind === "tarot"
          ? { kind: "tarot", card: offer.tarot }
          : { kind: "spectral", card: offer.spectral };
    s.spend(price);
    s.setConsumables((prev) => addConsumable(prev, next, consumableCapacity));
    s.markOfferSold(idx);
    return true;
  },
});
