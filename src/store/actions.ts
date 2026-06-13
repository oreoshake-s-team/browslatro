import type { StateCreator } from "zustand";
import { captureRunEvent } from "../ai/humanPlayWiring";
import { packOptionSnapshot, shopItemSnapshot } from "../ai/runEvents";
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
  applyEditionToRandomJoker,
  canSellJoker,
  copyRandomJokerDestroyOthers,
  createJokerByRarity,
  createLegendaryJokerCatalog,
  effectiveJokerCount,
  extraStartingHandSizeFromJokers,
  handEvalOptionsFromJokers,
  hasAstronomerInJokers,
  jokerSellValue,
  polychromeRandomJokerDestroyOthers,
  tickPerishableRounds,
  applyCardsDestroyedToJokerStates,
  applyShopRerollToJokerStates,
  applyRoundEndToJokerStates,
  applyPackSkipToJokerStates,
  applySellToJokerStates,
  interestMultiplierFromJokers,
  isJokerActive,
  allowsDuplicateJokers,
  applyGiftCardToJokerSellValues,
  cloneJoker,
} from "../items/jokers";
import {
  applyAstronomerPricing,
  applyEditionToFirstJoker,
  applyStakeStickersToShopOffers,
  buildFreeJokerOffers,
  ensureBaseJokerForEdition,
  mergeFreeJokerOffersIntoShop,
  pickShopItemOffers,
  pickShopOffers,
  pickSingleShopOffer,
  shopPickerRngConfig,
} from "../items/shop";
import {
  applyPlanetUpgrade,
  availablePlanets,
  createPlanetCatalog,
  mostPlayedHand,
  planetForHand,
} from "../items/planets";
import { createTarotCatalog, nextRankUp } from "../items/tarots";
import { pickRandomCardEdition } from "../cards/editions";
import {
  convertHandToRank,
  convertHandToSuit,
  createSpectralCatalog,
  transmuteHand,
  type ConvertHandResult,
  type SpectralEffect,
} from "../items/spectrals";
import {
  applyShopDiscount,
  BOSS_REROLL_COST,
  bossRerollsRemaining,
  editionRateMultiplier,
  extraConsumableSlots,
  extraHandSize,
  extraJokerSlots,
  extraShopOfferSlots,
  extraStartingDiscards,
  extraStartingHands,
  illusionEnabled,
  interestCapFor,
  offerKindWeights,
  pickVouchersForAnte,
  tarotToSpectralSwapChance,
  type VoucherId,
} from "../items/vouchers";
import { packPickLimit, type PackOffer } from "../items/packs";
import { nextCardId, shuffle, HAND_SIZE, RANKS, SUITS } from "../cards/deck";
import { detectHandLabel } from "../scoring/handEvaluator";
import { MAX_SELECTED } from "../components/cards/Hand";
import {
  applyEditionOverrides,
  applyEnhancementOverrides,
  applySealOverrides,
  fullDeckPile,
  initialDeal,
} from "../cards/deckBuild";
import { deckJokerSlotsDelta, deckSuppressesInterest } from "../items/decks";
import { recordUnusedDiscards } from "../run/runStats";
import { applyNextShopModifiers } from "../run/nextShopMods";
import {
  computeStartingDiscards,
  computeStartingHands,
} from "../run/roundSetup";
import { calculateInterest } from "../scoring/payout";
import { rollChance } from "../dev/chanceOverride";
import { pickRandomTarot } from "../cards/seals";
import { BlindValues, FINAL_ANTE } from "../constants";
import { hasStakeModifier, stakeStickerOdds } from "../items/stakes";
import type { Blind, Card, Enhancement, Hand, Seal, Suit } from "../cards/types";
import {
  rollAnteSkipOffers,
  tagOfferRngConfig,
  totalDeferredBossPayout,
} from "../items/tags";
import {
  bossAdjustHandEntry,
  bossPickerRngConfig,
  pickBossForAnte,
} from "../items/bosses";
import { BASE_VOUCHER_SLOTS } from "./vouchers";
import { availableJokerCatalog } from "./jokerCatalog";

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
  handleWin: (precomputed?: {
    readonly interest: number;
    readonly interestWallet: number;
  }) => void;
  continueEndless: () => void;
  applySpectralEffect: (effect: SpectralEffect) => void;
  applyEnhancementToSelectedPreviewCards: (enhancement: Enhancement) => void;
  applySealToSelectedPreviewCards: (seal: Seal) => void;
  applySuitToSelectedPreviewCards: (suit: Suit) => void;
  applyDeathCopyToSelectedPreviewCards: () => void;
  duplicateSelectedPreviewCards: (copies: number) => void;
  destroySelectedPreviewCards: () => void;
  rankUpSelectedPreviewCards: () => void;
  applyAuraSelectedPreviewCards: () => void;
  selectCards: (ids: Iterable<number>) => void;
  toggleCard: (card: Card) => void;
  adjustVoucherSlots: (delta: number) => void;
  rerollBoss: () => boolean;
}

function advanceToNextAnte(s: GameState): void {
  const nextAnte = s.ante + 1;
  s.setAnte(nextAnte);
  s.setBlind(1);
  s.setCurrentAnteVouchers(
    pickVouchersForAnte(
      { ante: nextAnte, ownedIds: s.ownedVoucherIds },
      BASE_VOUCHER_SLOTS + s.extraVoucherSlots,
    ),
  );
  s.setSoldVoucherIds(new Set());
  s.setSkipTagOffers(rollAnteSkipOffers(tagOfferRngConfig.rng));
  const nextRecent = new Set(s.recentBossIds);
  nextRecent.add(s.currentBoss.id);
  s.setRecentBossIds(nextRecent);
  s.setCurrentBoss(
    pickBossForAnte({
      ante: nextAnte,
      recentIds: nextRecent,
      rng: bossPickerRngConfig.rng,
    }),
  );
  s.setBossRerollsUsedThisAnte(0);
  s.setPlayedCardKeysThisAnte(new Set());
}

function openPostRoundShop(s: GameState, get: () => GameState): void {
  const next = get();
  const resourceCtx = {
    blind: next.blind,
    boss: next.currentBoss,
    ownedVoucherIds: next.ownedVoucherIds,
    deck: next.selectedDeck,
    jokers: next.jokers,
    stake: next.selectedStake,
  };
  s.setRemainingHands(computeStartingHands(resourceCtx));
  s.setRemainingDiscards(computeStartingDiscards(resourceCtx));
  s.setSoldJokerIdsThisShopVisit([]);
  const planetsForShop = availablePlanets(createPlanetCatalog(), s.handPlayCounts);
  const telescopePlanetId = s.ownedVoucherIds.has("telescope")
    ? planetForHand(planetsForShop, mostPlayedHand(s.handPlayCounts))?.id
    : undefined;
  const baseOffers = pickShopOffers({
    jokerCatalog: availableJokerCatalog(s),
    excludedJokerIds: [
      ...(allowsDuplicateJokers(s.jokers) ? [] : s.jokers.map((j) => j.id)),
      ...(s.grosMichelDestroyed ? [] : ["cavendish"]),
    ],
    planetCatalog: planetsForShop,
    tarotCatalog: createTarotCatalog(),
    spectralCatalog: createSpectralCatalog(),
    extraSlots: extraShopOfferSlots(s.ownedVoucherIds),
    extraPackSlots: s.extraPackSlots,
    forcedPackPools: s.pendingForcedPacks,
    editionRateMultiplier: editionRateMultiplier(s.ownedVoucherIds),
    tarotToSpectralSwapChance: tarotToSpectralSwapChance(s.ownedVoucherIds),
    guaranteedPlanetId: telescopePlanetId,
    kindWeights: offerKindWeights(s.ownedVoucherIds),
    illusionEnabled: illusionEnabled(s.ownedVoucherIds),
    rng: shopPickerRngConfig.rng,
  });
  const shopAdjustments = applyNextShopModifiers(s.pendingShopMods);
  const pricedOffers = shopAdjustments.freeShopItems
    ? baseOffers.map((offer) => ({ ...offer, price: 0 }))
    : baseOffers;
  const freeJokerOffers = buildFreeJokerOffers(
    shopAdjustments.freeJokerRarities,
    availableJokerCatalog(s),
    new Set(s.jokers.map((j) => j.id)),
    shopPickerRngConfig.rng,
  );
  const ownedJokerIds = new Set(s.jokers.map((j) => j.id));
  const editionedOffers = shopAdjustments.editionJokers.reduce(
    (offers, edition) => {
      const ensured = ensureBaseJokerForEdition(
        offers,
        availableJokerCatalog(s),
        ownedJokerIds,
        shopPickerRngConfig.rng,
      );
      return applyEditionToFirstJoker(ensured, edition);
    },
    mergeFreeJokerOffersIntoShop(pricedOffers, freeJokerOffers),
  );
  const stamped = applyStakeStickersToShopOffers(
    editionedOffers,
    stakeStickerOdds(s.selectedStake),
    shopPickerRngConfig.rng,
  );
  const astronomerPriced = applyAstronomerPricing(
    stamped,
    hasAstronomerInJokers(s.jokers),
  );
  s.setShopOffers(astronomerPriced);
  if (shopAdjustments.extraVouchers > 0) {
    s.setCurrentAnteVouchers((prev) => {
      const existing = new Set(prev.map((v) => v.id));
      const extra = pickVouchersForAnte(
        {
          ante: s.ante,
          ownedIds: s.ownedVoucherIds,
          excludeIds: new Set<VoucherId>([...s.ownedVoucherIds, ...existing]),
        },
        shopAdjustments.extraVouchers,
      );
      return [...prev, ...extra];
    });
  }
  s.setPendingForcedPacks([]);
  s.setDealt(
    fullDeckPile(
      s.baseDeckCards,
      s.destroyedCardIds,
      s.addedCards,
      s.cardEnhancementsById,
      s.cardSealsById,
      s.cardEditionsById,
    ),
  );
  s.setSelectedIds(new Set());
  s.setSelectedHand(null);
}

// Sigil/Ouija replace converted cards with new-id copies so the conversion
// persists into future deals: originals are registered as
// destroyed, copies as added, and any current selection is remapped onto the
// new ids (destroyedIds pairs index-for-index with additions).
function applyHandConversion(s: GameState, converted: ConvertHandResult): void {
  s.setDealt((prev) => ({ hand: converted.hand, remaining: prev.remaining }));
  if (converted.destroyedIds.length === 0) return;
  s.setDestroyedCardIds((prev) => {
    const next = new Set(prev);
    for (const id of converted.destroyedIds) next.add(id);
    return next;
  });
  s.setAddedCards((prev) => [...prev, ...converted.additions]);
  if (s.selectedIds.size > 0) {
    const idMap = new Map(
      converted.destroyedIds.map((oldId, i) => [
        oldId,
        converted.additions[i].id,
      ]),
    );
    s.setSelectedIds(
      (prev) => new Set([...prev].map((id) => idMap.get(id) ?? id)),
    );
  }
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
    s.setJokers((prev) => applySellToJokerStates(prev));
  },
  sellJoker: (jokerIdx) => {
    const s = get();
    const entry = s.jokers[jokerIdx];
    if (!entry) return;
    if (!canSellJoker(entry)) return;
    captureRunEvent(s, {
      kind: "joker-sell",
      joker: {
        id: entry.id,
        name: entry.name,
        sellValue: jokerSellValue(entry),
      },
      heldJokerIds: s.jokers.map((joker) => joker.id),
    });
    s.earn(jokerSellValue(entry));
    if (entry.effect.kind === "sell-creates-double-tag") {
      s.setPendingTags((prev) => [...prev, "double"]);
    }
    if (entry.effect.kind === "sell-disables-boss-blind" && s.blind === 3) {
      s.setCurrentBoss({ ...s.currentBoss, effect: { kind: "none" } });
    }
    if (
      s.blind === 3 &&
      s.currentBoss.effect.kind === "debuff-all-until-joker-sold"
    ) {
      s.setCurrentBoss({ ...s.currentBoss, effect: { kind: "none" } });
    }
    const duplicatesOnSell =
      entry.effect.kind === "sell-after-rounds-duplicates-joker" &&
      entry.state?.kind === "counter" &&
      entry.state.value >= entry.effect.rounds;
    s.setJokers((prev) => {
      const remaining = applySellToJokerStates(
        prev.filter((_, i) => i !== jokerIdx),
      );
      if (!duplicatesOnSell || remaining.length === 0) return remaining;
      const pick = remaining[Math.floor(Math.random() * remaining.length)];
      return [...remaining, cloneJoker(pick)];
    });
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
    captureRunEvent(s, {
      kind: "reroll",
      cost,
      offers: s.shopOffers
        .filter((candidate) => !candidate.sold)
        .map((candidate) =>
          shopItemSnapshot(
            candidate,
            applyShopDiscount(candidate.price, s.ownedVoucherIds),
          ),
        ),
    });
    s.spend(cost);
    s.setJokers((prev) => applyShopRerollToJokerStates(prev));
    const freshItems = pickShopItemOffers({
      jokerCatalog: availableJokerCatalog(s),
      excludedJokerIds: [
        ...(allowsDuplicateJokers(s.jokers) ? [] : s.jokers.map((j) => j.id)),
        ...s.soldJokerIdsThisShopVisit,
        ...(s.grosMichelDestroyed ? [] : ["cavendish"]),
      ],
      planetCatalog: availablePlanets(createPlanetCatalog(), s.handPlayCounts),
      tarotCatalog: createTarotCatalog(),
      spectralCatalog: createSpectralCatalog(),
      extraSlots: extraShopOfferSlots(s.ownedVoucherIds),
      editionRateMultiplier: editionRateMultiplier(s.ownedVoucherIds),
      tarotToSpectralSwapChance: tarotToSpectralSwapChance(s.ownedVoucherIds),
      kindWeights: offerKindWeights(s.ownedVoucherIds),
      illusionEnabled: illusionEnabled(s.ownedVoucherIds),
      rng: shopPickerRngConfig.rng,
    });
    const rerollAdjustments = applyNextShopModifiers(s.pendingShopMods);
    const pricedItems = rerollAdjustments.freeShopItems
      ? freshItems.map((o) => ({ ...o, price: 0 }))
      : freshItems;
    const stampedRerollItems = applyStakeStickersToShopOffers(
      pricedItems,
      stakeStickerOdds(s.selectedStake),
      shopPickerRngConfig.rng,
    );
    const astronomerPricedRerollItems = applyAstronomerPricing(
      stampedRerollItems,
      hasAstronomerInJokers(s.jokers),
    );
    s.setShopOffers((current) => {
      if (!current) return current;
      const existingPacks = current.filter((o) => o.kind === "pack");
      return [...astronomerPricedRerollItems, ...existingPacks];
    });
  },
  buyAnteVoucher: (voucherIdx) => {
    const s = get();
    const voucher = s.currentAnteVouchers[voucherIdx];
    if (!voucher) return;
    if (s.soldVoucherIds.has(voucher.id)) return;
    const price = applyShopDiscount(voucher.cost, s.ownedVoucherIds);
    if (s.money < price) return;
    if (voucher.requires && !s.ownedVoucherIds.has(voucher.requires)) return;
    captureRunEvent(s, {
      kind: "purchase",
      item: {
        itemType: "voucher",
        id: voucher.id,
        name: voucher.name,
        cost: price,
      },
      offers: s.currentAnteVouchers
        .filter((offer) => !s.soldVoucherIds.has(offer.id))
        .map((offer) => ({
          itemType: "voucher",
          id: offer.id,
          name: offer.name,
          cost: applyShopDiscount(offer.cost, s.ownedVoucherIds),
        })),
    });
    s.spend(price);
    const nextOwnedVoucherIds = new Set(s.ownedVoucherIds);
    nextOwnedVoucherIds.add(voucher.id);
    const handGain =
      extraStartingHands(nextOwnedVoucherIds) -
      extraStartingHands(s.ownedVoucherIds);
    const discardGain =
      extraStartingDiscards(nextOwnedVoucherIds) -
      extraStartingDiscards(s.ownedVoucherIds);
    if (handGain !== 0) {
      s.setRemainingHands((prev) => Math.max(0, prev + handGain));
    }
    if (discardGain !== 0) {
      s.setRemainingDiscards((prev) => Math.max(0, prev + discardGain));
    }
    if (voucher.id === "hieroglyph" || voucher.id === "petroglyph") {
      s.setAnte((prev) => Math.max(1, prev - 1));
    }
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
            jokerCatalog: availableJokerCatalog(s),
            excludedJokerIds: [
              ...(allowsDuplicateJokers(s.jokers) ? [] : s.jokers.map((j) => j.id)),
              ...s.soldJokerIdsThisShopVisit,
              ...(s.grosMichelDestroyed ? [] : ["cavendish"]),
            ],
            planetCatalog: availablePlanets(createPlanetCatalog(), s.handPlayCounts),
            tarotCatalog: createTarotCatalog(),
            spectralCatalog: createSpectralCatalog(),
            editionRateMultiplier: editionRateMultiplier(nextOwnedVoucherIds),
            tarotToSpectralSwapChance:
              tarotToSpectralSwapChance(nextOwnedVoucherIds),
            kindWeights: offerKindWeights(nextOwnedVoucherIds),
            illusionEnabled: illusionEnabled(nextOwnedVoucherIds),
            rng: shopPickerRngConfig.rng,
          },
          current,
        );
        if (!extra) return current;
        const [stampedExtra] = applyStakeStickersToShopOffers(
          [extra],
          stakeStickerOdds(s.selectedStake),
          shopPickerRngConfig.rng,
        );
        const [astronomerExtra] = applyAstronomerPricing(
          [stampedExtra],
          hasAstronomerInJokers(s.jokers),
        );
        return [...current, astronomerExtra];
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
    s.setPickedPackOptionIndices(new Set());
    const currentHandSize = Math.max(
      1,
      HAND_SIZE +
        s.handSizeModifier +
        extraHandSize(s.ownedVoucherIds) +
        extraStartingHandSizeFromJokers(s.jokers),
    );
    if (pack.pool === "arcana" || pack.pool === "spectral") {
      const survivingBase = s.baseDeckCards.filter(
        (c) => !s.destroyedCardIds.has(c.id),
      );
      const baseDeck = applyEditionOverrides(
        applySealOverrides(
          applyEnhancementOverrides(survivingBase, s.cardEnhancementsById),
          s.cardSealsById,
        ),
        s.cardEditionsById,
      );
      const extras = applyEditionOverrides(
        applySealOverrides(
          applyEnhancementOverrides(s.addedCards, s.cardEnhancementsById),
          s.cardSealsById,
        ),
        s.cardEditionsById,
      );
      s.setPackPreviewHand(
        shuffle([...baseDeck, ...extras]).slice(0, currentHandSize),
      );
    } else {
      s.setPackPreviewHand([]);
      if (s.dealt.hand.length === 0) {
        const fresh = initialDeal(
          s.baseDeckCards,
          s.destroyedCardIds,
          currentHandSize,
          s.addedCards,
          s.cardEnhancementsById,
          s.cardSealsById,
          s.cardEditionsById,
        );
        s.setDealt(fresh);
      }
    }
    s.setPackPreviewSelectedIds(new Set());
    s.setPackPreviewDisplayOrder([]);
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
    const tarotCapacity =
      MAX_CONSUMABLE_SLOTS + extraConsumableSlots(s.ownedVoucherIds);
    for (const joker of s.jokers.filter(isJokerActive)) {
      if (joker.effect.kind !== "pack-open-chance-creates-tarot") continue;
      if (!rollChance(joker.effect.chance, Math.random)) continue;
      s.setConsumables((prev) =>
        addConsumable(prev, { kind: "tarot", card: pickRandomTarot() }, tarotCapacity),
      );
    }
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
        s.setPackPreviewDisplayOrder([]);
        s.setPickedPackOptionIndices(new Set());
      }
      return remaining;
    });
  },
  closeOpenedPack: () => {
    const s = get();
    if (s.openedPack !== null && s.packPicksRemaining > 0) {
      captureRunEvent(s, {
        kind: "pack-pick",
        pool: s.openedPack.pool,
        variant: s.openedPack.variant,
        options: s.openedPack.options
          .filter((_, index) => !s.pickedPackOptionIndices.has(index))
          .map(packOptionSnapshot),
        pickedIndex: null,
        picksRemaining: s.packPicksRemaining,
      });
    }
    s.setJokers((prev) => applyPackSkipToJokerStates(prev));
    s.setOpenedPack(null);
    s.setPackPicksRemaining(0);
    s.setPackPreviewHand([]);
    s.setPackPreviewSelectedIds(new Set());
    s.setPackPreviewDisplayOrder([]);
    s.setPickedPackOptionIndices(new Set());
  },
  buyShopOffer: (idx) => {
    const s = get();
    const offer = s.shopOffers?.[idx];
    if (!offer || offer.sold) return false;
    const capturePurchase = (cost: number): void => {
      captureRunEvent(s, {
        kind: "purchase",
        item: shopItemSnapshot(offer, cost),
        offers: (s.shopOffers ?? [])
          .filter((candidate) => !candidate.sold)
          .map((candidate) =>
            shopItemSnapshot(
              candidate,
              applyShopDiscount(candidate.price, s.ownedVoucherIds),
            ),
          ),
      });
    };
    if (offer.kind === "pack") {
      const opened = s.openPack(idx);
      if (opened) {
        capturePurchase(applyShopDiscount(offer.price, s.ownedVoucherIds));
      }
      return opened;
    }
    const price = applyShopDiscount(offer.price, s.ownedVoucherIds);
    if (s.money < price) return false;
    if (offer.kind === "joker") {
      if (
        offer.joker.edition !== "negative" &&
        effectiveJokerCount(s.jokers) >=
          Math.max(
            0,
            MAX_JOKERS +
              extraJokerSlots(s.ownedVoucherIds) +
              deckJokerSlotsDelta(s.selectedDeck),
          )
      ) {
        return false;
      }
      capturePurchase(price);
      s.spend(price);
      s.setJokers((prev) => [...prev, offer.joker]);
      s.setSoldJokerIdsThisShopVisit((prev) => [...prev, offer.joker.id]);
      s.markOfferSold(idx);
      return true;
    }
    if (offer.kind === "playing-card") {
      capturePurchase(price);
      s.spend(price);
      s.setAddedCards((prev) => [...prev, offer.card]);
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
    capturePurchase(price);
    s.spend(price);
    s.setConsumables((prev) => addConsumable(prev, next, consumableCapacity));
    s.markOfferSold(idx);
    return true;
  },
  handleWin: (precomputed) => {
    const s = get();
    if (
      s.jokers.some(
        (j) => j.effect.kind === "round-end-grows-all-sell-values",
      )
    ) {
      s.setJokers((prev) => applyGiftCardToJokerSellValues(prev));
      const giftAmount = s.jokers.reduce(
        (sum, j) =>
          j.effect.kind === "round-end-grows-all-sell-values"
            ? sum + j.effect.amount
            : sum,
        0,
      );
      s.setConsumables((prev) =>
        prev.map((c) => ({ ...c, sellBonus: (c.sellBonus ?? 0) + giftAmount })),
      );
    }
    const jokersBeforeRoundEnd = get().jokers;
    const jokersAfterRoundEnd = applyRoundEndToJokerStates(
      tickPerishableRounds(jokersBeforeRoundEnd),
      Math.random,
      s.blind === 3,
    );
    if (
      jokersBeforeRoundEnd.some((j) => j.id === "gros-michel") &&
      !jokersAfterRoundEnd.some((j) => j.id === "gros-michel")
    ) {
      s.setGrosMichelDestroyed(true);
    }
    s.setJokers(jokersAfterRoundEnd);
    s.setRound((prev) => prev + 1);
    s.setRunStats((prev) => recordUnusedDiscards(prev, s.remainingDiscards));
    const baseBlindReward = s.blind + 2;
    const smallBlindSkipped =
      s.blind === 1 &&
      hasStakeModifier(s.selectedStake, "red-small-blind-no-reward");
    const blindReward = smallBlindSkipped ? 0 : baseBlindReward;
    const interestBefore = precomputed?.interestWallet ?? s.money;
    const interest =
      precomputed?.interest ??
      (deckSuppressesInterest(s.selectedDeck)
        ? 0
        : calculateInterest(interestBefore, interestCapFor(s.ownedVoucherIds)) *
          interestMultiplierFromJokers(s.jokers));
    s.earn(blindReward + interest);
    if (blindReward > 0) {
      s.setScoringEvents((prev) => [
        ...prev,
        {
          kind: "money-delta",
          amount: blindReward,
          source: `${BlindValues[s.blind]} reward`,
        },
      ]);
    }
    if (interest > 0) {
      s.setScoringEvents((prev) => [
        ...prev,
        {
          kind: "money-delta",
          amount: interest,
          source: `Interest on $${interestBefore}`,
        },
      ]);
    }
    if (s.blind < 3) {
      s.setBlind((prev) => (prev + 1) as Blind);
    } else {
      const tagPayout = totalDeferredBossPayout(s.pendingTags);
      if (tagPayout > 0) {
        s.earn(tagPayout);
        s.setPendingTags([]);
      }
      if (s.ante === FINAL_ANTE && !s.endlessMode) {
        const post = get();
        s.setPendingGameWon({
          finalAnte: s.ante,
          finalMoney: post.money,
          handsPlayed: post.runStats.handsPlayed,
          blindsSkipped: post.runStats.blindsSkipped,
        });
        return;
      }
      advanceToNextAnte(s);
    }
    openPostRoundShop(s, get);
  },
  continueEndless: () => {
    const s = get();
    if (!s.pendingGameWon) return;
    s.setEndlessMode(true);
    s.setPendingGameWon(null);
    advanceToNextAnte(s);
    openPostRoundShop(s, get);
  },
  applySpectralEffect: (effect) => {
    const s = get();
    switch (effect.kind) {
      case "black-hole":
        s.setHandStats((prev) => {
          let next = prev;
          for (const planet of createPlanetCatalog()) {
            next = applyPlanetUpgrade(next, planet);
          }
          return next;
        });
        return;
      case "immolate": {
        const handIds = s.dealt.hand.map((c) => c.id);
        const shuffled = [...handIds].sort(() => Math.random() - 0.5);
        const destroyed = new Set(shuffled.slice(0, effect.destroyCount));
        const destroyedCards = s.dealt.hand.filter((c) => destroyed.has(c.id));
        s.setDealt((prev) => ({
          hand: prev.hand.filter((c) => !destroyed.has(c.id)),
          remaining: prev.remaining,
        }));
        s.setDestroyedCardIds((prev) => {
          const next = new Set(prev);
          for (const id of destroyed) next.add(id);
          return next;
        });
        s.setJokers((prev) =>
          applyCardsDestroyedToJokerStates(prev, destroyedCards),
        );
        s.earn(effect.moneyGain);
        return;
      }
      case "sigil": {
        const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
        applyHandConversion(s, convertHandToSuit(s.dealt.hand, suit));
        return;
      }
      case "ouija": {
        const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
        applyHandConversion(s, convertHandToRank(s.dealt.hand, rank));
        s.setHandSizeModifier((prev) => prev + effect.handSizeDelta);
        return;
      }
      case "transmute": {
        const transmuted = transmuteHand(
          s.dealt.hand,
          effect.rankFilter,
          effect.addCount,
          Math.random,
        );
        s.setDealt((prev) => ({
          hand: transmuted.hand,
          remaining: prev.remaining,
        }));
        s.setDestroyedCardIds((prev) => {
          const next = new Set(prev);
          for (const id of transmuted.destroyedIds) next.add(id);
          return next;
        });
        s.setAddedCards((prev) => [...prev, ...transmuted.additions]);
        return;
      }
      case "create-joker-by-rarity": {
        const capacity = Math.max(
          0,
          MAX_JOKERS +
            extraJokerSlots(s.ownedVoucherIds) +
            deckJokerSlotsDelta(s.selectedDeck),
        );
        const created = createJokerByRarity(
          s.jokers,
          availableJokerCatalog(s),
          effect.rarity,
          capacity,
          Math.random,
        );
        if (!created) return;
        s.setJokers((prev) => [...prev, created]);
        if (effect.setMoneyToZero) s.setMoney(0);
        return;
      }
      case "ectoplasm": {
        s.setJokers((prev) =>
          applyEditionToRandomJoker(prev, "negative", Math.random),
        );
        s.setHandSizeModifier((prev) => prev + effect.handSizeDelta);
        return;
      }
      case "hex": {
        s.setJokers((prev) =>
          polychromeRandomJokerDestroyOthers(prev, Math.random),
        );
        return;
      }
      case "ankh": {
        s.setJokers((prev) =>
          copyRandomJokerDestroyOthers(prev, Math.random),
        );
        return;
      }
      case "create-legendary": {
        const capacity = Math.max(
          0,
          MAX_JOKERS +
            extraJokerSlots(s.ownedVoucherIds) +
            deckJokerSlotsDelta(s.selectedDeck),
        );
        const created = createJokerByRarity(
          s.jokers,
          createLegendaryJokerCatalog(),
          "legendary",
          capacity,
          Math.random,
        );
        if (created) s.setJokers((prev) => [...prev, created]);
        return;
      }
      case "apply-seal":
        return;
      case "duplicate-selected":
        return;
    }
  },
  applyEnhancementToSelectedPreviewCards: (enhancement) => {
    const s = get();
    const selectedIds = new Set<number>();
    for (const c of s.packPreviewHand) {
      if (s.packPreviewSelectedIds.has(c.id)) selectedIds.add(c.id);
    }
    s.setCardEnhancementsById((prev) => {
      const next = new Map(prev);
      for (const id of selectedIds) next.set(id, enhancement);
      return next;
    });
    s.setPackPreviewHand((prev) =>
      prev.map((c) =>
        s.packPreviewSelectedIds.has(c.id) ? { ...c, enhancement } : c,
      ),
    );
    s.setPackPreviewSelectedIds(new Set());
  },
  applySuitToSelectedPreviewCards: (suit) => {
    const s = get();
    s.setPackPreviewHand((prev) =>
      prev.map((c) =>
        s.packPreviewSelectedIds.has(c.id) ? { ...c, suit } : c,
      ),
    );
    s.setPackPreviewSelectedIds(new Set());
  },
  applySealToSelectedPreviewCards: (seal) => {
    const s = get();
    const selectedIds = new Set<number>();
    for (const c of s.packPreviewHand) {
      if (s.packPreviewSelectedIds.has(c.id)) selectedIds.add(c.id);
    }
    s.setCardSealsById((prev) => {
      const next = new Map(prev);
      for (const id of selectedIds) next.set(id, seal);
      return next;
    });
    s.setPackPreviewHand((prev) =>
      prev.map((c) =>
        s.packPreviewSelectedIds.has(c.id) ? { ...c, seal } : c,
      ),
    );
    s.setPackPreviewSelectedIds(new Set());
  },
  applyDeathCopyToSelectedPreviewCards: () => {
    const s = get();
    const byId = new Map(s.packPreviewHand.map((c) => [c.id, c]));
    const seen = new Set<number>();
    const orderedIds: number[] = [];
    for (const id of s.packPreviewDisplayOrder) {
      if (byId.has(id)) {
        orderedIds.push(id);
        seen.add(id);
      }
    }
    for (const c of s.packPreviewHand) {
      if (!seen.has(c.id)) orderedIds.push(c.id);
    }
    const selectedInOrder: Card[] = [];
    for (const id of orderedIds) {
      if (s.packPreviewSelectedIds.has(id)) {
        const c = byId.get(id);
        if (c) selectedInOrder.push(c);
      }
    }
    if (selectedInOrder.length !== 2) return;
    const [left, right] = selectedInOrder;
    const copied: Card = { ...right, id: left.id };
    s.setPackPreviewHand((prev) =>
      prev.map((c) => (c.id === left.id ? copied : c)),
    );
    s.setPackPreviewSelectedIds(new Set());
  },
  duplicateSelectedPreviewCards: (copies) => {
    const s = get();
    const originals = s.packPreviewHand.filter((c) =>
      s.packPreviewSelectedIds.has(c.id),
    );
    if (originals.length === 0 || copies <= 0) return;
    const additions: Card[] = [];
    for (const original of originals) {
      for (let i = 0; i < copies; i += 1) {
        additions.push({ ...original, id: nextCardId() });
      }
    }
    s.setAddedCards((prev) => [...prev, ...additions]);
    s.setPackPreviewHand((prev) => [...prev, ...additions]);
    s.setPackPreviewSelectedIds(new Set());
  },
  destroySelectedPreviewCards: () => {
    const s = get();
    const ids = new Set<number>();
    for (const c of s.packPreviewHand) {
      if (s.packPreviewSelectedIds.has(c.id)) ids.add(c.id);
    }
    if (ids.size === 0) return;
    const destroyedCards = s.packPreviewHand.filter((c) => ids.has(c.id));
    s.setDestroyedCardIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
    s.setJokers((prev) =>
      applyCardsDestroyedToJokerStates(prev, destroyedCards),
    );
    s.setPackPreviewHand((prev) => prev.filter((c) => !ids.has(c.id)));
    s.setPackPreviewSelectedIds(new Set());
  },
  rankUpSelectedPreviewCards: () => {
    const s = get();
    const oldIds = new Set<number>();
    const replacements: Card[] = [];
    for (const c of s.packPreviewHand) {
      if (!s.packPreviewSelectedIds.has(c.id)) continue;
      oldIds.add(c.id);
      replacements.push({ ...c, id: nextCardId(), rank: nextRankUp(c.rank) });
    }
    if (replacements.length === 0) return;
    s.setDestroyedCardIds((prev) => {
      const next = new Set(prev);
      for (const id of oldIds) next.add(id);
      return next;
    });
    s.setAddedCards((prev) => [...prev, ...replacements]);
    const replacementByOldId = new Map<number, Card>();
    const originalIds = [...oldIds];
    originalIds.forEach((id, i) => replacementByOldId.set(id, replacements[i]));
    s.setPackPreviewHand((prev) =>
      prev.map((c) => replacementByOldId.get(c.id) ?? c),
    );
    s.setPackPreviewSelectedIds(new Set());
  },
  applyAuraSelectedPreviewCards: () => {
    const s = get();
    const ids = s.packPreviewSelectedIds;
    if (ids.size === 0) return;
    // Roll outside the updater and record the edition in the run-level
    // overlay so it survives future deals.
    const rolled = s.packPreviewHand.map((c) =>
      ids.has(c.id)
        ? { ...c, edition: pickRandomCardEdition(Math.random) }
        : c,
    );
    s.setPackPreviewHand(rolled);
    s.setCardEditionsById((prev) => {
      const next = new Map(prev);
      for (const c of rolled) {
        if (ids.has(c.id) && c.edition !== undefined && c.edition !== null) {
          next.set(c.id, c.edition);
        }
      }
      return next;
    });
    s.setPackPreviewSelectedIds(new Set());
  },
  selectCards: (ids) => {
    const s = get();
    const nextIds = new Set(ids);
    s.setSelectedIds(nextIds);
    const nextSelected = s.dealt.hand.filter((c) => nextIds.has(c.id));
    const visibleSelected = nextSelected.filter((c) => c.faceDown !== true);
    if (visibleSelected.length === 0) {
      s.setSelectedHand(null);
      s.setChips(0);
      s.setMultiplier(0);
      return;
    }
    const label = detectHandLabel(
      visibleSelected,
      handEvalOptionsFromJokers(s.jokers),
    );
    const entry =
      s.blind === 3
        ? bossAdjustHandEntry(s.currentBoss, label, s.handStats[label])
        : s.handStats[label];
    const hand: Hand = {
      label,
      chips: entry.chips,
      multiplier: entry.multiplier,
    };
    s.setSelectedHand(hand);
    s.setChips(entry.chips);
    s.setMultiplier(entry.multiplier);
  },
  toggleCard: (card) => {
    const s = get();
    if (s.discardingIds.size > 0) return;
    const scoringInProgress =
      s.scoringCards.length > 0 && s.scoringIndex < s.scoringCards.length;
    if (scoringInProgress) return;
    let nextIds: Set<number>;
    if (s.selectedIds.has(card.id)) {
      nextIds = new Set(s.selectedIds);
      nextIds.delete(card.id);
    } else {
      if (s.selectedIds.size >= MAX_SELECTED) return;
      nextIds = new Set(s.selectedIds);
      nextIds.add(card.id);
    }
    s.selectCards(nextIds);
  },
  adjustVoucherSlots: (delta) => {
    const s = get();
    const nextExtra = Math.max(
      -BASE_VOUCHER_SLOTS,
      s.extraVoucherSlots + delta,
    );
    if (nextExtra === s.extraVoucherSlots) return;
    s.setExtraVoucherSlots(nextExtra);
    const nextCount = BASE_VOUCHER_SLOTS + nextExtra;
    s.setCurrentAnteVouchers((prev) => {
      if (nextCount === 0) return [];
      if (nextCount <= prev.length) return prev.slice(0, nextCount);
      const existingIds = new Set(prev.map((v) => v.id));
      const additional = pickVouchersForAnte(
        {
          ante: s.ante,
          ownedIds: s.ownedVoucherIds,
          excludeIds: new Set<VoucherId>([
            ...s.ownedVoucherIds,
            ...existingIds,
          ]),
        },
        nextCount - prev.length,
      );
      return [...prev, ...additional];
    });
  },
  rerollBoss: () => {
    const s = get();
    if (bossRerollsRemaining(s.ownedVoucherIds, s.bossRerollsUsedThisAnte) <= 0)
      return false;
    if (s.money < BOSS_REROLL_COST) return false;
    s.spend(BOSS_REROLL_COST);
    const exclude = new Set([...s.recentBossIds, s.currentBoss.id]);
    s.setCurrentBoss(
      pickBossForAnte({
        ante: s.ante,
        recentIds: exclude,
        rng: bossPickerRngConfig.rng,
      }),
    );
    s.setBossRerollsUsedThisAnte((prev) => prev + 1);
    return true;
  },
});
