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
  // Voucher ids to exclude from being picked. Distinct from ownedIds
  // because prerequisite satisfaction is checked against *owned* vouchers
  // only — a voucher merely sitting unsold in the shop must not satisfy
  // a prereq for its upgrade voucher. Defaults to ownedIds.
  readonly excludeIds?: ReadonlySet<VoucherId>;
  readonly catalog?: ReadonlyArray<Voucher>;
  readonly rng?: RandomSource;
}

function isEligible(
  voucher: Voucher,
  ownedIds: ReadonlySet<VoucherId>,
  excludeIds: ReadonlySet<VoucherId>,
): boolean {
  if (excludeIds.has(voucher.id)) return false;
  if (voucher.requires && !ownedIds.has(voucher.requires)) return false;
  return true;
}

export function pickVoucherForAnte(args: PickVoucherArgs): Voucher | null {
  const catalog = args.catalog ?? VOUCHER_CATALOG;
  const rng = args.rng ?? Math.random;
  const excludeIds = args.excludeIds ?? args.ownedIds;
  const eligible = catalog.filter((v) =>
    isEligible(v, args.ownedIds, excludeIds),
  );
  if (eligible.length === 0) return null;
  return eligible[Math.floor(rng() * eligible.length)];
}

export function pickVouchersForAnte(
  args: PickVoucherArgs,
  count: number,
): ReadonlyArray<Voucher> {
  const target = Math.max(0, Math.floor(count));
  if (target === 0) return [];
  const catalog = args.catalog ?? VOUCHER_CATALOG;
  const rng = args.rng ?? Math.random;
  const baseExclude = args.excludeIds ?? args.ownedIds;
  const picked: Voucher[] = [];
  const pickedIds = new Set<VoucherId>();
  for (let i = 0; i < target; i += 1) {
    const excludeIds = new Set<VoucherId>([...baseExclude, ...pickedIds]);
    const eligible = catalog.filter((v) =>
      isEligible(v, args.ownedIds, excludeIds),
    );
    if (eligible.length === 0) break;
    const next = eligible[Math.floor(rng() * eligible.length)];
    picked.push(next);
    pickedIds.add(next.id);
  }
  return picked;
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
