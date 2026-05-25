import type { RandomSource } from "./jokers";

export const VOUCHER_BASE_PRICE = 10;

export type VoucherId = "overstock" | "overstock-plus";

export interface Voucher {
  readonly id: VoucherId;
  readonly name: string;
  readonly description: string;
  readonly cost: number;
  readonly requires?: VoucherId;
}

export const VOUCHER_CATALOG: ReadonlyArray<Voucher> = [
  { id: "overstock", name: "Overstock", description: "Adds an extra shop slot.", cost: VOUCHER_BASE_PRICE },
  { id: "overstock-plus", name: "Overstock Plus", description: "Adds yet another shop slot.", cost: VOUCHER_BASE_PRICE, requires: "overstock" },
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
