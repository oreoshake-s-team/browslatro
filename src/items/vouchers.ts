import type { RandomSource } from "./jokers";

export const VOUCHER_BASE_PRICE = 10;

export type VoucherId =
  | "overstock"
  | "overstock-plus"
  | "clearance-sale"
  | "liquidation"
  | "crystal-ball";

export interface Voucher {
  readonly id: VoucherId;
  readonly name: string;
  readonly description: string;
  readonly cost: number;
  readonly requires?: VoucherId;
}

export const VOUCHER_CATALOG: ReadonlyArray<Voucher> = [
  { id: "overstock", name: "Overstock", description: "+1 shop offer slot.", cost: VOUCHER_BASE_PRICE },
  { id: "overstock-plus", name: "Overstock Plus", description: "+1 additional shop offer slot.", cost: VOUCHER_BASE_PRICE, requires: "overstock" },
  { id: "clearance-sale", name: "Clearance Sale", description: "All shop items 25% off.", cost: VOUCHER_BASE_PRICE },
  { id: "liquidation", name: "Liquidation", description: "All shop items 50% off.", cost: VOUCHER_BASE_PRICE, requires: "clearance-sale" },
  { id: "crystal-ball", name: "Crystal Ball", description: "+1 consumable slot.", cost: VOUCHER_BASE_PRICE },
];

export function createVoucherCatalog(): ReadonlyArray<Voucher> {
  return VOUCHER_CATALOG;
}

export interface PickVoucherArgs {
  readonly ante: number;
  readonly ownedIds: ReadonlySet<VoucherId>;
  readonly catalog?: ReadonlyArray<Voucher>;
  readonly rng?: RandomSource;
}

export function pickVoucherForAnte(args: PickVoucherArgs): Voucher | null {
  const catalog = args.catalog ?? VOUCHER_CATALOG;
  const rng = args.rng ?? Math.random;
  const eligible = catalog.filter(
    (v) => !args.ownedIds.has(v.id) && (!v.requires || args.ownedIds.has(v.requires)),
  );
  if (eligible.length === 0) return null;
  return eligible[Math.floor(rng() * eligible.length)];
}

export function extraShopOfferSlots(ownedIds: ReadonlySet<VoucherId>): number {
  let extra = 0;
  if (ownedIds.has("overstock")) extra += 1;
  if (ownedIds.has("overstock-plus")) extra += 1;
  return extra;
}

export function shopPriceDiscount(ownedIds: ReadonlySet<VoucherId>): number {
  if (ownedIds.has("liquidation")) return 0.5;
  if (ownedIds.has("clearance-sale")) return 0.25;
  return 0;
}

export function applyShopDiscount(
  price: number,
  ownedIds: ReadonlySet<VoucherId>,
): number {
  const discount = shopPriceDiscount(ownedIds);
  if (discount === 0) return price;
  return Math.max(1, Math.ceil(price * (1 - discount)));
}

export function extraConsumableSlots(ownedIds: ReadonlySet<VoucherId>): number {
  return ownedIds.has("crystal-ball") ? 1 : 0;
}
