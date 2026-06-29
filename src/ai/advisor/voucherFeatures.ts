import {
  OBSERVATORY_MULT_PER_PLANET,
  bossRerollsAllowedPerAnte,
  editionRateMultiplier,
  extraConsumableSlots,
  extraHandSize,
  extraJokerSlots,
  extraShopOfferSlots,
  extraStartingDiscards,
  extraStartingHands,
  illusionEnabled,
  interestCapFor,
  magicTrickEnabled,
  observatoryMultFor,
  offerKindWeights,
  rerollCostReduction,
  shopPriceDiscount,
  tarotToSpectralSwapChance,
  type Voucher,
  type VoucherId,
} from "../../items/vouchers";

const BASE_INTEREST_CAP = 5;

function bossRerollSignal(owned: ReadonlySet<VoucherId>): number {
  const allowed = bossRerollsAllowedPerAnte(owned);
  if (!Number.isFinite(allowed)) return 1;
  return Math.min(allowed, 2) / 2;
}

const VOUCHER_FEATURE_FNS: ReadonlyArray<
  (owned: ReadonlySet<VoucherId>) => number
> = [
  (owned) => extraShopOfferSlots(owned) / 2,
  (owned) => shopPriceDiscount(owned) * 2,
  (owned) => extraConsumableSlots(owned),
  (owned) => rerollCostReduction(owned) / 4,
  (owned) => (interestCapFor(owned) - BASE_INTEREST_CAP) / 15,
  (owned) => extraStartingHands(owned) / 2,
  (owned) => extraStartingDiscards(owned) / 2,
  (owned) => extraHandSize(owned) / 2,
  (owned) => extraJokerSlots(owned),
  (owned) => (editionRateMultiplier(owned) - 1) / 3,
  (owned) => tarotToSpectralSwapChance(owned) / 0.2,
  (owned) => (magicTrickEnabled(owned) ? 1 : 0),
  (owned) => (illusionEnabled(owned) ? 1 : 0),
  (owned) => (offerKindWeights(owned).tarot - 1) / 3,
  (owned) => (offerKindWeights(owned).planet - 1) / 3,
  (owned) => bossRerollSignal(owned),
  (owned) =>
    (observatoryMultFor(owned, 1) - 1) / (OBSERVATORY_MULT_PER_PLANET - 1),
  (owned) => (owned.has("telescope") ? 1 : 0),
];

export const VOUCHER_FEATURES = VOUCHER_FEATURE_FNS.length;

export const ZERO_VOUCHER_FEATURES: ReadonlyArray<number> = new Array(
  VOUCHER_FEATURES,
).fill(0);

export function voucherFeatureVector(voucher: Voucher): number[] {
  const owned: ReadonlySet<VoucherId> = new Set<VoucherId>([voucher.id]);
  return VOUCHER_FEATURE_FNS.map((fn) => fn(owned));
}
