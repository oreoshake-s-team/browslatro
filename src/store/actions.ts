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
  applyEditionToRandomJoker,
  canSellJoker,
  copyRandomJokerDestroyOthers,
  createJokerByRarity,
  createJokerCatalog,
  createLegendaryJokerCatalog,
  effectiveJokerCount,
  extraStartingHandSizeFromJokers,
  handEvalOptionsFromJokers,
  hasAstronomerInJokers,
  jokerSellValue,
  polychromeRandomJokerDestroyOthers,
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
} from "../items/planets";
import { createTarotCatalog } from "../items/tarots";
import {
  createSpectralCatalog,
  transmuteHand,
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
  interestCapFor,
  pickVouchersForAnte,
  type VoucherId,
} from "../items/vouchers";
import { packPickLimit, type PackOffer } from "../items/packs";
import { nextCardId, shuffle, HAND_SIZE, RANKS, SUITS } from "../cards/deck";
import { detectHandLabel } from "../scoring/handEvaluator";
import { MAX_SELECTED } from "../components/cards/Hand";
import {
  applyEnhancementOverrides,
  applySealOverrides,
  fullDeckPile,
} from "../cards/deckBuild";
import { recordUnusedDiscards } from "../run/runStats";
import { applyNextShopModifiers } from "../run/nextShopMods";
import {
  computeStartingDiscards,
  computeStartingHands,
} from "../run/roundSetup";
import { calculateInterest } from "../scoring/payout";
import { BlindValues } from "../constants";
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
  applySpectralEffect: (effect: SpectralEffect) => void;
  applyEnhancementToSelectedPreviewCards: (enhancement: Enhancement) => void;
  applySealToSelectedPreviewCards: (seal: Seal) => void;
  applySuitToSelectedPreviewCards: (suit: Suit) => void;
  duplicateSelectedPreviewCards: (copies: number) => void;
  toggleCard: (card: Card) => void;
  adjustVoucherSlots: (delta: number) => void;
  rerollBoss: () => boolean;
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
    if (!canSellJoker(entry)) return;
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
      editionRateMultiplier: editionRateMultiplier(s.ownedVoucherIds),
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
            jokerCatalog: createJokerCatalog(),
            excludedJokerIds: [
              ...s.jokers.map((j) => j.id),
              ...s.soldJokerIdsThisShopVisit,
            ],
            planetCatalog: availablePlanets(createPlanetCatalog(), s.handPlayCounts),
            tarotCatalog: createTarotCatalog(),
            spectralCatalog: createSpectralCatalog(),
            editionRateMultiplier: editionRateMultiplier(nextOwnedVoucherIds),
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
    if (pack.pool === "arcana" || pack.pool === "spectral") {
      const currentHandSize = Math.max(
        1,
        HAND_SIZE +
          s.handSizeModifier +
          extraHandSize(s.ownedVoucherIds) +
          extraStartingHandSizeFromJokers(s.jokers),
      );
      const survivingBase = s.baseDeckCards.filter(
        (c) => !s.destroyedCardIds.has(c.id),
      );
      const baseDeck = applySealOverrides(
        applyEnhancementOverrides(survivingBase, s.cardEnhancementsById),
        s.cardSealsById,
      );
      const extras = applySealOverrides(
        applyEnhancementOverrides(s.addedCards, s.cardEnhancementsById),
        s.cardSealsById,
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
        s.setPickedPackOptionIndices(new Set());
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
    s.setPickedPackOptionIndices(new Set());
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
  handleWin: (precomputed) => {
    const s = get();
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
      calculateInterest(interestBefore, interestCapFor(s.ownedVoucherIds));
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
    const baseOffers = pickShopOffers({
      jokerCatalog: createJokerCatalog(),
      excludedJokerIds: s.jokers.map((j) => j.id),
      planetCatalog: availablePlanets(createPlanetCatalog(), s.handPlayCounts),
      tarotCatalog: createTarotCatalog(),
      spectralCatalog: createSpectralCatalog(),
      extraSlots: extraShopOfferSlots(s.ownedVoucherIds),
      extraPackSlots: s.extraPackSlots,
      forcedPackPools: s.pendingForcedPacks,
      editionRateMultiplier: editionRateMultiplier(s.ownedVoucherIds),
      rng: shopPickerRngConfig.rng,
    });
    const shopAdjustments = applyNextShopModifiers(s.pendingShopMods);
    const pricedOffers = shopAdjustments.freeShopItems
      ? baseOffers.map((offer) => ({ ...offer, price: 0 }))
      : baseOffers;
    const freeJokerOffers = buildFreeJokerOffers(
      shopAdjustments.freeJokerRarities,
      createJokerCatalog(),
      new Set(s.jokers.map((j) => j.id)),
      shopPickerRngConfig.rng,
    );
    const ownedJokerIds = new Set(s.jokers.map((j) => j.id));
    const editionedOffers = shopAdjustments.editionJokers.reduce(
      (offers, edition) => {
        const ensured = ensureBaseJokerForEdition(
          offers,
          createJokerCatalog(),
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
      ),
    );
    s.setSelectedIds(new Set());
    s.setSelectedHand(null);
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
        s.setDealt((prev) => ({
          hand: prev.hand.filter((c) => !destroyed.has(c.id)),
          remaining: prev.remaining,
        }));
        s.earn(effect.moneyGain);
        return;
      }
      case "sigil": {
        const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
        s.setDealt((prev) => ({
          hand: prev.hand.map((c) => ({ ...c, suit })),
          remaining: prev.remaining,
        }));
        return;
      }
      case "ouija": {
        const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
        s.setDealt((prev) => ({
          hand: prev.hand.map((c) => ({ ...c, rank })),
          remaining: prev.remaining,
        }));
        s.setHandSizeModifier((prev) => prev + effect.handSizeDelta);
        return;
      }
      case "transmute": {
        s.setDealt((prev) => ({
          hand: transmuteHand(
            prev.hand,
            effect.rankFilter,
            effect.addCount,
            Math.random,
          ),
          remaining: prev.remaining,
        }));
        return;
      }
      case "create-joker-by-rarity": {
        const capacity = MAX_JOKERS + extraJokerSlots(s.ownedVoucherIds);
        const created = createJokerByRarity(
          s.jokers,
          createJokerCatalog(),
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
        const capacity = MAX_JOKERS + extraJokerSlots(s.ownedVoucherIds);
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
    s.setSelectedIds(nextIds);
    if (nextIds.size === 0) {
      s.setSelectedHand(null);
      s.setChips(0);
      s.setMultiplier(0);
      return;
    }
    const nextSelected = s.dealt.hand.filter((c) => nextIds.has(c.id));
    const label = detectHandLabel(
      nextSelected,
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
