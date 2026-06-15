import type { AdviceFeedbackEvent } from "../runEvents";
import type { MoveExplanationState } from "./useMoveExplanation";
import { MODEL_ID } from "./model";

type ReadyExplanation = Extract<MoveExplanationState, { phase: "ready" }>;

export function buildHandAdviceFeedbackEvent(
  explanation: ReadyExplanation,
  correctedIndex: number | null,
): AdviceFeedbackEvent {
  return {
    kind: "advice-feedback",
    advisorKind: "llm",
    model: MODEL_ID,
    recommendationIndex: explanation.advice.recommendationIndex,
    alternativeIndex: explanation.advice.alternativeIndex,
    verdict: "bad",
    correctedIndex,
    source: "explicit",
    decision: {
      context: "hand",
      state: explanation.modelState,
      candidates: explanation.candidates,
    },
  };
}
