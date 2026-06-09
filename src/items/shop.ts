import type {
  Joker,
  JokerEdition,
  JokerRarity,
  RandomSource,
  StakeStickerOdds,
} from "./jokers";
import {
  RENTAL_BASE_PRICE,
  applyStakeStickersOnRoll,
  hasSticker,
  pickRandomFromCatalog,
  rollEdition,
  withEdition,
} from "./jokers";
import type { PlanetCard } from "./planets";
import type { SpectralCard } from "./spectrals";
import { hiddenSpectralForRoll } from "./spectrals";
import type { TarotCard } from "./tarots";
import type { OfferKindWeights } from "./vouchers";
import { JOKER_BASE_PRICE } from "../constants";
import type { Card } from "../cards/types";
import { RANKS, SUITS, nextCardId } from "../cards/deck";
import { ENHANCEMENT_KINDS } from "../cards/enhancements";
import { CARD_EDITION_KINDS } from "../cards/editions";
import { SEAL_KINDS } from "../cards/seals";

export const PLAYING_CARD_BASE_PRICE = 4;
export const ILLUSION_MODIFIER_CHANCE = 0.4;

export function jokerOfferPrice(joker: Joker): number {
  if (hasSticker(joker, "rental")) return RENTAL_BASE_PRICE;
  return JOKER_BASE_PRICE;
}
import { rollChance } from "../dev/chanceOverride";
import { createRngConfig } from "../dev/rngConfig";
import { PLANET_BASE_PRICE } from "./planets";
import { SPECTRAL_BASE_PRICE } from "./spectrals";
import { TAROT_BASE_PRICE } from "./tarots";
import {
  type PackOffer,
  type PackPool,
  packPrice,
  rollPack,
  rollPackForPool,
} from "./packs";

export const SPECTRAL_OFFER_CHANCE = 0.15;

export const SHOP_OFFER_SLOTS = 2;
export const SHOP_PACK_SLOTS = 2;

export const BASE_REROLL_COST = 5;

type ForceableShopOfferKind = "joker" | "planet" | "tarot" | "spectral";

const KIND_TO_RNG: Record<ForceableShopOfferKind, number> = {
  joker: 0.05,
  planet: 0.4,
  tarot: 0.75,
  spectral: 0,
};

export function forceShopLayout(
  kinds: ReadonlyArray<ForceableShopOfferKind>,
): () => number {
  let slotIdx = 0;
  let callsConsumed = 0;
  return () => {
    const target = kinds[slotIdx] ?? "joker";
    if (target === "spectral") {
      if (callsConsumed === 0) {
        callsConsumed = 1;
        return 0;
      }
      callsConsumed = 0;
      slotIdx += 1;
      return 0;
    }
    if (callsConsumed === 0) {
      callsConsumed = 1;
      return 0.99;
    }
    if (callsConsumed === 1) {
      callsConsumed = 2;
      return KIND_TO_RNG[target];
    }
    callsConsumed = 0;
    slotIdx += 1;
    return 0;
  };
}

const FORCE_OFFER_KINDS_KEY = "browslatro:forceShopOfferKinds";
const FORCEABLE_KINDS: ReadonlyArray<ForceableShopOfferKind> = [
  "joker",
  "planet",
  "tarot",
  "spectral",
];

function isForceableKind(value: string): value is ForceableShopOfferKind {
  return (FORCEABLE_KINDS as ReadonlyArray<string>).includes(value);
}

function readForcedKindsFromStorage(): ReadonlyArray<ForceableShopOfferKind> | null {
  try {
    const raw = window.localStorage.getItem(FORCE_OFFER_KINDS_KEY);
    if (!raw) return null;
    const parsed = raw
      .split(",")
      .map((s) => s.trim())
      .filter(isForceableKind);
    return parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function defaultRng(): RandomSource {
  const forced = readForcedKindsFromStorage();
  return forced !== null ? forceShopLayout(forced) : Math.random;
}

export const shopPickerRngConfig = createRngConfig(defaultRng());

export type ShopItem =
  | {
      readonly kind: "joker";
      readonly joker: Joker;
      readonly price: number;
      readonly sold: boolean;
    }
  | {
      readonly kind: "planet";
      readonly planet: PlanetCard;
      readonly price: number;
      readonly sold: boolean;
    }
  | {
      readonly kind: "tarot";
      readonly tarot: TarotCard;
      readonly price: number;
      readonly sold: boolean;
    }
  | {
      readonly kind: "spectral";
      readonly spectral: SpectralCard;
      readonly price: number;
      readonly sold: boolean;
    }
  | {
      readonly kind: "playing-card";
      readonly card: Card;
      readonly price: number;
      readonly sold: boolean;
    }
  | {
      readonly kind: "pack";
      readonly pack: PackOffer;
      readonly price: number;
      readonly sold: boolean;
    };

export function rollPlayingCardOffer(
  rng: RandomSource,
  options: { readonly illusionEnabled?: boolean } = {},
): ShopItem {
  const rank = RANKS[Math.floor(rng() * RANKS.length)];
  const suit = SUITS[Math.floor(rng() * SUITS.length)];
  const base: Card = { id: nextCardId(), rank, suit };
  if (!options.illusionEnabled) {
    return { kind: "playing-card", card: base, price: PLAYING_CARD_BASE_PRICE, sold: false };
  }
  const enhancement = rollChance(ILLUSION_MODIFIER_CHANCE, rng)
    ? ENHANCEMENT_KINDS[Math.floor(rng() * ENHANCEMENT_KINDS.length)]
    : null;
  const edition = rollChance(ILLUSION_MODIFIER_CHANCE, rng)
    ? CARD_EDITION_KINDS[Math.floor(rng() * CARD_EDITION_KINDS.length)]
    : null;
  const seal = rollChance(ILLUSION_MODIFIER_CHANCE, rng)
    ? SEAL_KINDS[Math.floor(rng() * SEAL_KINDS.length)]
    : null;
  const card: Card = {
    ...base,
    ...(enhancement ? { enhancement } : {}),
    ...(edition ? { edition } : {}),
    ...(seal ? { seal } : {}),
  };
  return { kind: "playing-card", card, price: PLAYING_CARD_BASE_PRICE, sold: false };
}

export function buildFreeJokerOffers(
  rarities: ReadonlyArray<JokerRarity>,
  catalog: ReadonlyArray<Joker>,
  ownedIds: ReadonlySet<string>,
  rng: RandomSource = Math.random,
): ShopItem[] {
  return rarities.flatMap((rarity) => {
    const joker = pickRandomFromCatalog(
      catalog,
      (j) => j.rarity === rarity && !ownedIds.has(j.id),
      rng,
    );
    return joker ? [{ kind: "joker" as const, joker, price: 0, sold: false }] : [];
  });
}

export function mergeFreeJokerOffersIntoShop(
  baseOffers: ReadonlyArray<ShopItem>,
  freeJokerOffers: ReadonlyArray<ShopItem>,
): ShopItem[] {
  if (freeJokerOffers.length === 0) return [...baseOffers];
  const items = baseOffers.filter((o) => o.kind !== "pack");
  const packs = baseOffers.filter((o) => o.kind === "pack");
  const merged = [...freeJokerOffers, ...items].slice(0, items.length);
  return [...merged, ...packs];
}

export function applyEditionToFirstJoker(
  offers: ReadonlyArray<ShopItem>,
  edition: JokerEdition,
): ShopItem[] {
  const targetIdx = offers.findIndex(
    (offer) => offer.kind === "joker" && offer.joker.edition === undefined,
  );
  if (targetIdx === -1) return [...offers];
  return offers.map((offer, idx) => {
    if (idx !== targetIdx || offer.kind !== "joker") return offer;
    return { ...offer, joker: withEdition(offer.joker, edition), price: 0 };
  });
}

export function ensureBaseJokerForEdition(
  offers: ReadonlyArray<ShopItem>,
  jokerCatalog: ReadonlyArray<Joker>,
  excludedIds: ReadonlySet<string>,
  rng: RandomSource = Math.random,
): ShopItem[] {
  const hasBaseJoker = offers.some(
    (o) => o.kind === "joker" && o.joker.edition === undefined,
  );
  if (hasBaseJoker) return [...offers];
  const usedIds = new Set<string>(excludedIds);
  for (const o of offers) {
    if (o.kind === "joker") usedIds.add(o.joker.id);
  }
  const joker = pickRandomFromCatalog(
    jokerCatalog,
    (j) => !usedIds.has(j.id),
    rng,
  );
  if (!joker) return [...offers];
  const replaceIdx = offers.findIndex(
    (o) => o.kind !== "pack" && o.kind !== "joker",
  );
  const fresh: ShopItem = {
    kind: "joker",
    joker,
    price: jokerOfferPrice(joker),
    sold: false,
  };
  if (replaceIdx === -1) return [fresh, ...offers];
  return offers.map((offer, idx) => (idx === replaceIdx ? fresh : offer));
}

export function applyAstronomerPricing(
  offers: ReadonlyArray<ShopItem>,
  astronomerActive: boolean,
): ShopItem[] {
  if (!astronomerActive) return [...offers];
  return offers.map((offer) => {
    if (offer.kind === "planet") return { ...offer, price: 0 };
    if (offer.kind === "pack" && offer.pack.pool === "celestial") {
      return { ...offer, price: 0 };
    }
    return offer;
  });
}

export function applyStakeStickersToShopOffers(
  offers: ReadonlyArray<ShopItem>,
  odds: StakeStickerOdds | undefined,
  rng: RandomSource = Math.random,
): ShopItem[] {
  if (!odds) return [...offers];
  return offers.map((offer) => {
    if (offer.kind === "joker") {
      const stamped = applyStakeStickersOnRoll(offer.joker, odds, rng);
      if (stamped === offer.joker) return offer;
      const price = offer.price === 0 ? 0 : jokerOfferPrice(stamped);
      return { ...offer, joker: stamped, price };
    }
    if (offer.kind === "pack") {
      const options = offer.pack.options.map((opt) =>
        opt.kind === "joker"
          ? { ...opt, joker: applyStakeStickersOnRoll(opt.joker, odds, rng) }
          : opt,
      );
      return { ...offer, pack: { ...offer.pack, options } };
    }
    return offer;
  });
}

export function rerollCostFor(
  rerollCount: number,
  reduction: number = 0,
): number {
  const safe = rerollCount < 0 ? 0 : Math.floor(rerollCount);
  return Math.max(0, BASE_REROLL_COST + safe - Math.max(0, reduction));
}

function pickRandom<T extends { readonly id: string }>(
  catalog: ReadonlyArray<T>,
  excludedIds: ReadonlyArray<string>,
  rng: RandomSource,
): T | null {
  const excluded = new Set<string>(excludedIds);
  const pool = catalog.filter((item) => !excluded.has(item.id));
  if (pool.length === 0) return null;
  return pool[Math.floor(rng() * pool.length)];
}

export function pickRandomJoker(
  catalog: ReadonlyArray<Joker>,
  excludedIds: ReadonlyArray<string>,
  rng: RandomSource = Math.random,
): Joker | null {
  return pickRandom(catalog, excludedIds, rng);
}

export function pickRandomPlanet(
  catalog: ReadonlyArray<PlanetCard>,
  excludedIds: ReadonlyArray<string>,
  rng: RandomSource = Math.random,
): PlanetCard | null {
  return pickRandom(catalog, excludedIds, rng);
}

export function pickRandomTarot(
  catalog: ReadonlyArray<TarotCard>,
  excludedIds: ReadonlyArray<string>,
  rng: RandomSource = Math.random,
): TarotCard | null {
  return pickRandom(catalog, excludedIds, rng);
}

function jokerOffer(joker: Joker): ShopItem {
  return { kind: "joker", joker, price: jokerOfferPrice(joker), sold: false };
}

function planetOffer(planet: PlanetCard): ShopItem {
  return { kind: "planet", planet, price: PLANET_BASE_PRICE, sold: false };
}

function tarotOffer(tarot: TarotCard): ShopItem {
  return { kind: "tarot", tarot, price: TAROT_BASE_PRICE, sold: false };
}

function spectralOffer(spectral: SpectralCard): ShopItem {
  return { kind: "spectral", spectral, price: SPECTRAL_BASE_PRICE, sold: false };
}

function packShopOffer(pack: PackOffer): ShopItem {
  return { kind: "pack", pack, price: packPrice(pack.variant), sold: false };
}

export interface PickShopOffersArgs {
  readonly jokerCatalog: ReadonlyArray<Joker>;
  readonly excludedJokerIds: ReadonlyArray<string>;
  readonly planetCatalog: ReadonlyArray<PlanetCard>;
  readonly tarotCatalog: ReadonlyArray<TarotCard>;
  readonly spectralCatalog: ReadonlyArray<SpectralCard>;
  readonly extraSlots?: number;
  readonly extraPackSlots?: number;
  readonly forcedPackPools?: ReadonlyArray<PackPool>;
  readonly editionRateMultiplier?: number;
  readonly tarotToSpectralSwapChance?: number;
  readonly guaranteedPlanetId?: string;
  readonly kindWeights?: OfferKindWeights;
  readonly illusionEnabled?: boolean;
  readonly rng?: RandomSource;
}

type ShopOfferKind = Exclude<ShopItem["kind"], "pack">;
const COMMON_OFFER_KINDS: ReadonlyArray<ShopOfferKind> = [
  "joker",
  "planet",
  "tarot",
  "playing-card",
];

interface PickedOfferIds {
  readonly joker: ReadonlySet<string>;
  readonly planet: ReadonlySet<string>;
  readonly tarot: ReadonlySet<string>;
  readonly spectral: ReadonlySet<string>;
}

function emptyPickedIds(): PickedOfferIds {
  return {
    joker: new Set(),
    planet: new Set(),
    tarot: new Set(),
    spectral: new Set(),
  };
}

function pickOfferByKind(
  kind: ShopOfferKind,
  args: PickShopOffersArgs,
  rng: RandomSource,
  picked: PickedOfferIds,
): ShopItem | null {
  switch (kind) {
    case "joker": {
      const excluded = [...args.excludedJokerIds, ...picked.joker];
      const next = pickRandom(args.jokerCatalog, excluded, rng);
      if (!next) return null;
      const multiplier = args.editionRateMultiplier ?? 1;
      if (multiplier <= 1) return jokerOffer(next);
      const edition = rollEdition(rng, multiplier);
      return jokerOffer(edition ? withEdition(next, edition) : next);
    }
    case "planet": {
      const next = pickRandom(args.planetCatalog, [...picked.planet], rng);
      return next ? planetOffer(next) : null;
    }
    case "tarot": {
      const swapChance = args.tarotToSpectralSwapChance ?? 0;
      if (swapChance > 0 && rollChance(swapChance, rng)) {
        const spectral = pickOfferByKind("spectral", args, rng, picked);
        if (spectral) return spectral;
      }
      const next = pickRandom(args.tarotCatalog, [...picked.tarot], rng);
      return next ? tarotOffer(next) : null;
    }
    case "spectral": {
      const roll = rng();
      const hidden = hiddenSpectralForRoll(roll, args.spectralCatalog);
      if (hidden && !picked.spectral.has(hidden.id)) {
        return spectralOffer(hidden);
      }
      const pool = args.spectralCatalog.filter((s) => !s.hidden);
      const excludedIds = new Set(picked.spectral);
      const eligible = pool.filter((s) => !excludedIds.has(s.id));
      if (eligible.length === 0) return null;
      const idx = Math.floor(roll * eligible.length);
      return spectralOffer(eligible[idx]);
    }
    case "playing-card": {
      return rollPlayingCardOffer(rng, {
        illusionEnabled: args.illusionEnabled === true,
      });
    }
  }
}

function recordPicked(picked: PickedOfferIds, offer: ShopItem): void {
  switch (offer.kind) {
    case "joker":
      (picked.joker as Set<string>).add(offer.joker.id);
      return;
    case "planet":
      (picked.planet as Set<string>).add(offer.planet.id);
      return;
    case "tarot":
      (picked.tarot as Set<string>).add(offer.tarot.id);
      return;
    case "spectral":
      (picked.spectral as Set<string>).add(offer.spectral.id);
      return;
    case "playing-card":
      return;
    case "pack":
      return;
  }
}

function weightFor(
  weights: OfferKindWeights | undefined,
  kind: ShopOfferKind,
): number {
  if (kind === "spectral") return 0;
  if (kind === "playing-card") {
    const w = weights ? weights["playing-card"] : 0;
    return w > 0 ? w : 0;
  }
  const w = weights ? weights[kind] : 1;
  return w > 0 ? w : 0;
}

function pickWeightedKindOrder(
  args: PickShopOffersArgs,
  rng: RandomSource,
): ReadonlyArray<ShopOfferKind> {
  const weights = COMMON_OFFER_KINDS.map((k) => weightFor(args.kindWeights, k));
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) {
    const fallbackKinds = COMMON_OFFER_KINDS.filter(
      (k) => k !== "playing-card",
    );
    const start = Math.floor(rng() * fallbackKinds.length);
    return fallbackKinds.map(
      (_, i) => fallbackKinds[(start + i) % fallbackKinds.length],
    );
  }
  const roll = rng() * total;
  let acc = 0;
  let firstIdx = 0;
  for (let i = 0; i < COMMON_OFFER_KINDS.length; i += 1) {
    acc += weights[i];
    if (roll < acc) {
      firstIdx = i;
      break;
    }
  }
  const order: ShopOfferKind[] = [COMMON_OFFER_KINDS[firstIdx]];
  for (let i = 0; i < COMMON_OFFER_KINDS.length; i += 1) {
    if (i === firstIdx) continue;
    if (weights[i] === 0) continue;
    order.push(COMMON_OFFER_KINDS[i]);
  }
  return order;
}

function pickRandomKindOffer(
  args: PickShopOffersArgs,
  rng: RandomSource,
  picked: PickedOfferIds,
): ShopItem | null {
  if (rollChance(SPECTRAL_OFFER_CHANCE, rng)) {
    const spectral = pickOfferByKind("spectral", args, rng, picked);
    if (spectral) return spectral;
  }
  const order = pickWeightedKindOrder(args, rng);
  for (const kind of order) {
    const offer = pickOfferByKind(kind, args, rng, picked);
    if (offer) return offer;
  }
  return null;
}

function pickedIdsFromOffers(
  offers: ReadonlyArray<ShopItem>,
): PickedOfferIds {
  const picked = emptyPickedIds();
  for (const offer of offers) recordPicked(picked, offer);
  return picked;
}

export function pickSingleShopOffer(
  args: PickShopOffersArgs,
  existing: ReadonlyArray<ShopItem>,
): ShopItem | null {
  const rng = args.rng ?? Math.random;
  return pickRandomKindOffer(args, rng, pickedIdsFromOffers(existing));
}

export function pickShopItemOffers(
  args: PickShopOffersArgs,
): ReadonlyArray<ShopItem> {
  const rng = args.rng ?? Math.random;
  const totalSlots = SHOP_OFFER_SLOTS + Math.max(0, args.extraSlots ?? 0);
  const slots: ShopItem[] = [];
  const picked = emptyPickedIds();
  for (let i = 0; i < totalSlots; i += 1) {
    const offer = pickRandomKindOffer(args, rng, picked);
    if (offer) {
      recordPicked(picked, offer);
      slots.push(offer);
    }
  }
  return slots;
}

export function pickShopOffers(args: PickShopOffersArgs): ReadonlyArray<ShopItem> {
  const rng = args.rng ?? Math.random;
  const slots: ShopItem[] = [...pickShopItemOffers(args)];
  const forced = args.forcedPackPools ?? [];
  const rollArgs = {
    planetCatalog: args.planetCatalog,
    tarotCatalog: args.tarotCatalog,
    jokerCatalog: args.jokerCatalog,
    spectralCatalog: args.spectralCatalog,
    excludedJokerIds: args.excludedJokerIds,
    guaranteedPlanetId: args.guaranteedPlanetId,
    rng,
  };
  for (const pool of forced) {
    slots.push(packShopOffer(rollPackForPool(pool, rollArgs)));
  }
  const totalPackSlots = Math.max(
    0,
    SHOP_PACK_SLOTS + (args.extraPackSlots ?? 0),
  );
  const remainingPackSlots = Math.max(0, totalPackSlots - forced.length);
  for (let i = 0; i < remainingPackSlots; i += 1) {
    slots.push(packShopOffer(rollPack(rollArgs)));
  }
  return slots;
}

export function rerollShopOffer(
  current: ShopItem,
  args: PickShopOffersArgs,
): ShopItem | null {
  if (current.kind === "pack") return null;
  const picked = emptyPickedIds();
  recordPicked(picked, current);
  return pickRandomKindOffer(args, args.rng ?? Math.random, picked);
}
