import type { GameState } from "../../store/game";
import { captureAdviceFeedback } from "../humanPlayWiring";
import { buildShopPolicyFeedbackEvent } from "./adviceFeedback";
import type { ShopSuggestionAction } from "./shopAdvicePlan";
import type {
  ShopAdviceCandidate,
  ShopAdviceState,
  ShopRolloutState,
} from "./types";

export interface ShownShopAdvice {
  readonly shop: ShopAdviceState;
  readonly candidates: ReadonlyArray<ShopAdviceCandidate>;
  readonly actions: ReadonlyArray<ShopSuggestionAction>;
  readonly recommendationIndex: number;
  readonly rollout: ShopRolloutState;
}

let shown: ShownShopAdvice | null = null;

export function rememberShopAdvice(advice: ShownShopAdvice): void {
  shown = advice;
}

export function clearShopAdvice(): void {
  shown = null;
}

function sameAction(a: ShopSuggestionAction, b: ShopSuggestionAction): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "buy" && b.kind === "buy") return a.offerIdx === b.offerIdx;
  if (a.kind === "buy-voucher" && b.kind === "buy-voucher") {
    return a.voucherIdx === b.voucherIdx;
  }
  return true;
}

export function matchedShopDisagreement(
  committed: ShopSuggestionAction,
): { readonly advice: ShownShopAdvice; readonly correctedIndex: number } | null {
  if (shown === null) return null;
  const index = shown.actions.findIndex((action) => sameAction(action, committed));
  if (index < 0 || index === shown.recommendationIndex) return null;
  return { advice: shown, correctedIndex: index };
}

export function recordShopDisagreement(
  committed: ShopSuggestionAction,
  state: GameState,
): void {
  const match = matchedShopDisagreement(committed);
  clearShopAdvice();
  if (match === null) return;
  captureAdviceFeedback(
    state,
    buildShopPolicyFeedbackEvent(
      match.advice.shop,
      match.advice.candidates,
      match.advice.recommendationIndex,
      match.correctedIndex,
      "auto-disagreement",
      match.advice.rollout,
    ),
  );
}
