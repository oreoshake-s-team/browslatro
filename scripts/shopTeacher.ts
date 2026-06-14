import type {
  ShopAdviceCandidate,
  ShopAdviceRequest,
  ShopAdviceState,
} from "../src/ai/advisor/types";
import type { ShopView } from "../src/ai/headlessRun";
import { MAX_JOKERS } from "../src/items/jokers/constants";

const DEFAULT_CONSUMABLE_CAPACITY = 2;

export type ShopTeacherLabeler = (
  view: ShopView,
  candidates: ReadonlyArray<ShopAdviceCandidate>,
) => Promise<number | null>;

export function shopStateFromView(view: ShopView): ShopAdviceState {
  return {
    money: view.money,
    ante: view.ante,
    jokers: view.jokers.map((joker) => ({ id: joker.id, name: joker.name })),
    jokerCapacity: MAX_JOKERS,
    consumables: [],
    consumableCapacity: DEFAULT_CONSUMABLE_CAPACITY,
    ownedVoucherIds: [...view.ownedVoucherIds],
  };
}

export function buildShopAdviceRequest(
  view: ShopView,
  candidates: ReadonlyArray<ShopAdviceCandidate>,
): ShopAdviceRequest {
  return {
    context: "shop",
    shop: shopStateFromView(view),
    candidates: [...candidates],
  };
}

export function createShopTeacher(apiKey: string): ShopTeacherLabeler {
  return async (view, candidates) => {
    const { requestAdvice } = await import("../src/ai/advisor/model");
    const result = await requestAdvice(
      buildShopAdviceRequest(view, candidates),
      apiKey,
    );
    if (!result.ok) return null;
    const index = result.advice.recommendationIndex;
    if (index < 0 || index >= candidates.length) return null;
    return index;
  };
}
