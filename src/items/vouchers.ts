import { createRngConfig } from "../dev/rngConfig";
import type { RandomSource } from "./jokers";

export const VOUCHER_BASE_PRICE = 10;

export const voucherPickerRngConfig = createRngConfig();

export type VoucherId =
  | "overstock"
  | "overstock-plus"
  | "clearance-sale"
  | "liquidation"
  | "crystal-ball"
  | "reroll-surplus"
  | "reroll-glut"
  | "seed-money"
  | "money-tree"
  | "grabber"
  | "nacho-tong"
  | "wasteful"
  | "recyclomancy"
  | "paint-brush"
  | "palette"
  | "blank"
  | "antimatter"
  | "hieroglyph"
  | "petroglyph";

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
  { id: "reroll-surplus", name: "Reroll Surplus", description: "Rerolls cost $2 less.", cost: VOUCHER_BASE_PRICE },
  { id: "reroll-glut", name: "Reroll Glut", description: "Rerolls cost an additional $2 less.", cost: VOUCHER_BASE_PRICE, requires: "reroll-surplus" },
  { id: "seed-money", name: "Seed Money", description: "Raise the interest cap to $10.", cost: VOUCHER_BASE_PRICE },
  { id: "money-tree", name: "Money Tree", description: "Raise the interest cap to $20.", cost: VOUCHER_BASE_PRICE, requires: "seed-money" },
  { id: "grabber", name: "Grabber", description: "+1 hand per round.", cost: VOUCHER_BASE_PRICE },
  { id: "nacho-tong", name: "Nacho Tong", description: "+1 additional hand per round.", cost: VOUCHER_BASE_PRICE, requires: "grabber" },
  { id: "wasteful", name: "Wasteful", description: "+1 discard per round.", cost: VOUCHER_BASE_PRICE },
  { id: "recyclomancy", name: "Recyclomancy", description: "+1 additional discard per round.", cost: VOUCHER_BASE_PRICE, requires: "wasteful" },
  { id: "paint-brush", name: "Paint Brush", description: "+1 hand size.", cost: VOUCHER_BASE_PRICE },
  { id: "palette", name: "Palette", description: "+1 additional hand size.", cost: VOUCHER_BASE_PRICE, requires: "paint-brush" },
  { id: "blank", name: "Blank", description: "Does nothing… for now.", cost: VOUCHER_BASE_PRICE },
  { id: "antimatter", name: "Antimatter", description: "+1 joker slot.", cost: VOUCHER_BASE_PRICE, requires: "blank" },
  { id: "hieroglyph", name: "Hieroglyph", description: "-1 Ante, -1 hand per round.", cost: VOUCHER_BASE_PRICE },
  { id: "petroglyph", name: "Petroglyph", description: "-1 Ante, -1 discard per round.", cost: VOUCHER_BASE_PRICE, requires: "hieroglyph" },
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
  const rng = args.rng ?? voucherPickerRngConfig.rng;
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
  const rng = args.rng ?? voucherPickerRngConfig.rng;
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

export function rerollCostReduction(ownedIds: ReadonlySet<VoucherId>): number {
  let reduction = 0;
  if (ownedIds.has("reroll-surplus")) reduction += 2;
  if (ownedIds.has("reroll-glut")) reduction += 2;
  return reduction;
}

export function interestCapFor(ownedIds: ReadonlySet<VoucherId>): number {
  if (ownedIds.has("money-tree")) return 20;
  if (ownedIds.has("seed-money")) return 10;
  return 5;
}

export function extraStartingHands(ownedIds: ReadonlySet<VoucherId>): number {
  let extra = 0;
  if (ownedIds.has("grabber")) extra += 1;
  if (ownedIds.has("nacho-tong")) extra += 1;
  if (ownedIds.has("hieroglyph")) extra -= 1;
  return extra;
}

export function extraStartingDiscards(ownedIds: ReadonlySet<VoucherId>): number {
  let extra = 0;
  if (ownedIds.has("wasteful")) extra += 1;
  if (ownedIds.has("recyclomancy")) extra += 1;
  if (ownedIds.has("petroglyph")) extra -= 1;
  return extra;
}

export function extraHandSize(ownedIds: ReadonlySet<VoucherId>): number {
  let extra = 0;
  if (ownedIds.has("paint-brush")) extra += 1;
  if (ownedIds.has("palette")) extra += 1;
  return extra;
}

export function extraJokerSlots(ownedIds: ReadonlySet<VoucherId>): number {
  return ownedIds.has("antimatter") ? 1 : 0;
}
