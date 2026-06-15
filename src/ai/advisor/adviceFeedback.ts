import type { AdviceFeedbackEvent } from "../runEvents";
import type { AutopilotDecision } from "./autopilot";
import { ADVISOR_POLICY_MODEL_ID } from "./advisorRanker";

export function buildHandPolicyFeedbackEvent(
  decision: AutopilotDecision,
  correctedIndex: number | null,
): AdviceFeedbackEvent {
  return {
    kind: "advice-feedback",
    advisorKind: "policy",
    model: ADVISOR_POLICY_MODEL_ID,
    recommendationIndex: decision.recommendationIndex,
    alternativeIndex: null,
    verdict: "bad",
    correctedIndex,
    source: "explicit",
    decision: {
      context: "hand",
      state: decision.modelState,
      candidates: decision.candidates,
    },
  };
}
