import type {
  AdviceFeedbackEvent,
  AdviceFeedbackSource,
  AdviceVerdict,
} from "../runEvents";
import type { AutopilotDecision } from "./autopilot";
import { ADVISOR_POLICY_MODEL_ID } from "./advisorRanker";
import { SHOP_POLICY_MODEL_ID } from "./shopRanker";
import type {
  ShopAdviceCandidate,
  ShopAdviceState,
  ShopRolloutState,
} from "./types";

export function buildShopPolicyFeedbackEvent(
  shop: ShopAdviceState,
  candidates: ReadonlyArray<ShopAdviceCandidate>,
  recommendationIndex: number,
  correctedIndex: number | null,
  source: AdviceFeedbackSource = "explicit",
  rollout?: ShopRolloutState,
  verdict: AdviceVerdict = "bad",
): AdviceFeedbackEvent {
  return {
    kind: "advice-feedback",
    advisorKind: "policy",
    model: SHOP_POLICY_MODEL_ID,
    recommendationIndex,
    alternativeIndex: null,
    verdict,
    correctedIndex,
    source,
    decision: {
      context: "shop",
      state: shop,
      candidates,
      ...(rollout !== undefined ? { rollout } : {}),
    },
  };
}

export function buildHandPolicyFeedbackEvent(
  decision: AutopilotDecision,
  correctedIndex: number | null,
  source: AdviceFeedbackSource = "explicit",
  verdict: AdviceVerdict = "bad",
): AdviceFeedbackEvent {
  return {
    kind: "advice-feedback",
    advisorKind: "policy",
    model: ADVISOR_POLICY_MODEL_ID,
    recommendationIndex: decision.recommendationIndex,
    alternativeIndex: null,
    verdict,
    correctedIndex,
    source,
    decision: {
      context: "hand",
      state: decision.modelState,
      candidates: decision.candidates,
    },
  };
}
