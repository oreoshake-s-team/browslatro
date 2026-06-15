// @vitest-environment node
import { beforeEach, describe, expect, test } from "vitest";
import { buildHandAdviceFeedbackEvent } from "./adviceFeedback";
import { MODEL_ID } from "./model";
import { toModelState } from "../modelState";
import { toModelStateInput } from "./snapshot";
import { useGame } from "../../store/game";
import type { HandOption } from "../getHandOptions";
import type { MoveExplanationState } from "./useMoveExplanation";

beforeEach(() => {
  useGame.getState().resetGame();
});

function readyExplanation(): Extract<MoveExplanationState, { phase: "ready" }> {
  const candidates: HandOption[] = [
    { action: "play", cardIds: [1, 2], handLabel: "Pair", score: 40, chips: 20, mult: 2, notes: [] },
    { action: "discard", cardIds: [3, 4], notes: [] },
  ];
  return {
    phase: "ready",
    candidates,
    advice: {
      recommendationIndex: 0,
      alternativeIndex: 1,
      whyAlternativeWorse: "x",
      explanation: "y",
      concept: "z",
    },
    modelState: toModelState(toModelStateInput(useGame.getState())),
  };
}

describe("buildHandAdviceFeedbackEvent", () => {
  test("tags the event as advisor downvote feedback", () => {
    const event = buildHandAdviceFeedbackEvent(readyExplanation(), 1);
    expect(event.kind).toBe("advice-feedback");
  });

  test("records the LLM advisor kind", () => {
    const event = buildHandAdviceFeedbackEvent(readyExplanation(), 1);
    expect(event.advisorKind).toBe("llm");
  });

  test("records the advisor model identity", () => {
    const event = buildHandAdviceFeedbackEvent(readyExplanation(), 1);
    expect(event.model).toBe(MODEL_ID);
  });

  test("carries the advisor's recommendation index", () => {
    const event = buildHandAdviceFeedbackEvent(readyExplanation(), 1);
    expect(event.recommendationIndex).toBe(0);
  });

  test("records the corrective pick as correctedIndex", () => {
    const event = buildHandAdviceFeedbackEvent(readyExplanation(), 1);
    expect(event.correctedIndex).toBe(1);
  });

  test("records a bare downvote as a null corrected index", () => {
    const event = buildHandAdviceFeedbackEvent(readyExplanation(), null);
    expect(event.correctedIndex).toBeNull();
  });

  test("marks the source as an explicit click", () => {
    const event = buildHandAdviceFeedbackEvent(readyExplanation(), null);
    expect(event.source).toBe("explicit");
  });

  test("embeds the hand decision context for re-encoding", () => {
    const event = buildHandAdviceFeedbackEvent(readyExplanation(), 1);
    expect(event.decision.context).toBe("hand");
  });

  test("embeds the candidate list the advisor saw", () => {
    const event = buildHandAdviceFeedbackEvent(readyExplanation(), 1);
    expect(event.decision.candidates).toHaveLength(2);
  });
});
