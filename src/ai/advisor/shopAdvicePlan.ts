import type { Consumable } from "../../items/consumables";
import type { Joker } from "../../items/jokers";
import type { ShopItem } from "../../items/shop";
import {
  applyShopDiscount,
  type Voucher,
  type VoucherId,
} from "../../items/vouchers";
import {
  consumableRefs,
  jokerRefs,
  shopAdviceItem,
  voucherAdviceItem,
} from "./contextSnapshots";
import {
  MAX_CANDIDATES,
  MIN_CONTEXT_CANDIDATES,
  type ShopAdviceCandidate,
  type ShopAdviceRequest,
} from "./types";

export type ShopSuggestionAction =
  | { readonly kind: "buy"; readonly offerIdx: number }
  | { readonly kind: "buy-voucher"; readonly voucherIdx: number }
  | { readonly kind: "reroll"; readonly cost: number }
  | { readonly kind: "leave" };

export interface ShopAdvicePlan {
  readonly request: ShopAdviceRequest;
  readonly actions: ReadonlyArray<ShopSuggestionAction>;
}

export interface ShopAdviceInput {
  readonly money: number;
  readonly ante: number;
  readonly jokers: ReadonlyArray<Joker>;
  readonly consumables: ReadonlyArray<Consumable>;
  readonly equippedJokerCount: number;
  readonly jokerCapacity: number;
  readonly consumableCount: number;
  readonly consumableCapacity: number;
  readonly offers: ReadonlyArray<ShopItem>;
  readonly vouchers: ReadonlyArray<Voucher>;
  readonly soldVoucherIds: ReadonlySet<VoucherId>;
  readonly ownedVoucherIds: ReadonlySet<VoucherId>;
  readonly rerollCost: number;
}

function isBuyable(offer: ShopItem, price: number, input: ShopAdviceInput): boolean {
  if (offer.sold) return false;
  if (offer.kind === "joker" && input.equippedJokerCount >= input.jokerCapacity) {
    return false;
  }
  if (
    (offer.kind === "planet" ||
      offer.kind === "tarot" ||
      offer.kind === "spectral") &&
    input.consumableCount >= input.consumableCapacity
  ) {
    return false;
  }
  return input.money >= price;
}

function isVoucherBuyable(
  voucher: Voucher,
  price: number,
  input: ShopAdviceInput,
): boolean {
  if (input.soldVoucherIds.has(voucher.id)) return false;
  if (voucher.requires && !input.ownedVoucherIds.has(voucher.requires)) {
    return false;
  }
  return input.money >= price;
}

interface PlanEntry {
  readonly candidate: ShopAdviceCandidate;
  readonly action: ShopSuggestionAction;
}

export function buildShopAdvicePlan(input: ShopAdviceInput): ShopAdvicePlan | null {
  const buys: PlanEntry[] = [];
  input.offers.forEach((offer, offerIdx) => {
    const price = applyShopDiscount(offer.price, input.ownedVoucherIds);
    if (!isBuyable(offer, price, input)) return;
    buys.push({
      candidate: { action: "buy", item: shopAdviceItem(offer, price) },
      action: { kind: "buy", offerIdx },
    });
  });
  input.vouchers.forEach((voucher, voucherIdx) => {
    const price = applyShopDiscount(voucher.cost, input.ownedVoucherIds);
    if (!isVoucherBuyable(voucher, price, input)) return;
    buys.push({
      candidate: { action: "buy", item: voucherAdviceItem(voucher, price) },
      action: { kind: "buy-voucher", voucherIdx },
    });
  });
  const tail: PlanEntry[] = [];
  if (input.money >= input.rerollCost) {
    tail.push({
      candidate: { action: "reroll", cost: input.rerollCost },
      action: { kind: "reroll", cost: input.rerollCost },
    });
  }
  tail.push({ candidate: { action: "leave" }, action: { kind: "leave" } });
  const entries = [...buys.slice(0, MAX_CANDIDATES - tail.length), ...tail];
  if (entries.length < MIN_CONTEXT_CANDIDATES) return null;
  return {
    request: {
      context: "shop",
      shop: {
        money: input.money,
        ante: input.ante,
        jokers: jokerRefs(input.jokers),
        jokerCapacity: input.jokerCapacity,
        consumables: consumableRefs(input.consumables),
        consumableCapacity: input.consumableCapacity,
        ownedVoucherIds: [...input.ownedVoucherIds],
      },
      candidates: entries.map((entry) => entry.candidate),
    },
    actions: entries.map((entry) => entry.action),
  };
}
