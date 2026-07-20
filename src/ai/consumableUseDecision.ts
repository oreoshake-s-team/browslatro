import type { GameState } from "../store/game";
import {
  chosenCandidateIndex,
  shopCandidateRows,
  shopItemSnapshot,
  usedItemSnapshot,
  type ShopCandidateRow,
} from "./shopCandidateRows";

export interface ConsumableUseDecision {
  readonly item: ReturnType<typeof usedItemSnapshot>;
  readonly offers: ReadonlyArray<ReturnType<typeof shopItemSnapshot>>;
  readonly candidates: ReadonlyArray<ShopCandidateRow>;
  readonly chosenIndex: number;
  readonly consumablesHeld: number;
}

export function consumableUseDecision(
  state: Pick<GameState, "shopOffers" | "consumables">,
  usedIndex: number,
): ConsumableUseDecision | null {
  const held = state.consumables;
  const used = held[usedIndex];
  if (!used) return null;
  const offers = state.shopOffers ?? [];
  return {
    item: usedItemSnapshot(used, usedIndex),
    offers: offers.map(shopItemSnapshot),
    candidates: shopCandidateRows(offers, held, null),
    chosenIndex: chosenCandidateIndex(offers.length, held.length, false, {
      kind: "use",
      index: usedIndex,
    }),
    consumablesHeld: held.length,
  };
}
