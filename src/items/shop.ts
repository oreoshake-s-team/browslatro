import type { Joker, RandomSource } from "./jokers";
import type { PlanetCard } from "./planets";
import type { SpectralCard } from "./spectrals";
import type { TarotCard } from "./tarots";
import { JOKER_BASE_PRICE } from "../constants";
import { PLANET_BASE_PRICE } from "./planets";
import { SPECTRAL_BASE_PRICE } from "./spectrals";
import { TAROT_BASE_PRICE } from "./tarots";
import { type PackOffer, packPrice, rollPack } from "./packs";

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

export const shopPickerRngConfig: { rng: RandomSource } = { rng: defaultRng() };

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
      readonly kind: "pack";
      readonly pack: PackOffer;
      readonly price: number;
      readonly sold: boolean;
    };

export function rerollCostFor(rerollCount: number): number {
  const safe = rerollCount < 0 ? 0 : Math.floor(rerollCount);
  return BASE_REROLL_COST + safe;
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
  return { kind: "joker", joker, price: JOKER_BASE_PRICE, sold: false };
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
  readonly rng?: RandomSource;
}

type ShopOfferKind = Exclude<ShopItem["kind"], "pack">;
const COMMON_OFFER_KINDS: ReadonlyArray<ShopOfferKind> = ["joker", "planet", "tarot"];

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
      return next ? jokerOffer(next) : null;
    }
    case "planet": {
      const next = pickRandom(args.planetCatalog, [...picked.planet], rng);
      return next ? planetOffer(next) : null;
    }
    case "tarot": {
      const next = pickRandom(args.tarotCatalog, [...picked.tarot], rng);
      return next ? tarotOffer(next) : null;
    }
    case "spectral": {
      const next = pickRandom(args.spectralCatalog, [...picked.spectral], rng);
      return next ? spectralOffer(next) : null;
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
    case "pack":
      return;
  }
}

function pickRandomKindOffer(
  args: PickShopOffersArgs,
  rng: RandomSource,
  picked: PickedOfferIds,
): ShopItem | null {
  if (rng() < SPECTRAL_OFFER_CHANCE) {
    const spectral = pickOfferByKind("spectral", args, rng, picked);
    if (spectral) return spectral;
  }
  const start = Math.floor(rng() * COMMON_OFFER_KINDS.length);
  for (let i = 0; i < COMMON_OFFER_KINDS.length; i += 1) {
    const kind = COMMON_OFFER_KINDS[(start + i) % COMMON_OFFER_KINDS.length];
    const offer = pickOfferByKind(kind, args, rng, picked);
    if (offer) return offer;
  }
  return null;
}

export function pickShopOffers(args: PickShopOffersArgs): ReadonlyArray<ShopItem> {
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
  const packSlotCount = Math.max(
    0,
    SHOP_PACK_SLOTS + (args.extraPackSlots ?? 0),
  );
  for (let i = 0; i < packSlotCount; i += 1) {
    slots.push(
      packShopOffer(
        rollPack({
          planetCatalog: args.planetCatalog,
          tarotCatalog: args.tarotCatalog,
          jokerCatalog: args.jokerCatalog,
          spectralCatalog: args.spectralCatalog,
          excludedJokerIds: args.excludedJokerIds,
          rng,
        }),
      ),
    );
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
