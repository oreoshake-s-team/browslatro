import { useCallback, useEffect, useRef, useState } from "react";
import { useAutopilot, type AutopilotControls } from "./useAutopilot";
import { useAdviceFeedbackNotice } from "./useAdviceFeedbackNotice";
import {
  useMoveExplanation,
  type MoveExplanationState,
} from "../ai/advisor/useMoveExplanation";
import { buildHandPolicyFeedbackEvent } from "../ai/advisor/adviceFeedback";
import {
  clearHandAdvice,
  rememberHandAdvice,
} from "../ai/advisor/shownHandAdvice";
import { captureAdviceFeedback } from "../ai/humanPlayWiring";
import { useGame } from "../store/game";
import type { AutopilotDecision } from "../ai/advisor/autopilot";

export interface AutopilotExecutor {
  readonly play: () => void;
  readonly discard: () => void;
}

export interface AutopilotController {
  readonly enabled: boolean;
  readonly onToggle: () => void;
  readonly autopilot: AutopilotControls;
  readonly explanation: MoveExplanationState;
  readonly onAskAi: () => void;
  readonly onFeedback: (correctedIndex: number | null) => void;
  readonly onAgree: () => void;
  readonly feedbackRecorded: boolean;
  readonly policyDecision: AutopilotDecision | null;
}

export function useAutopilotController(
  isScoring: boolean,
  executor: AutopilotExecutor,
): AutopilotController {
  const [enabled, setEnabled] = useState(false);
  const autopilot = useAutopilot(enabled, isScoring, executor, () =>
    setEnabled(false),
  );

  const explanation = useMoveExplanation();
  const proposal = autopilot.pendingProposal;
  const skipExplanationResetRef = useRef(false);
  useEffect(() => {
    if (skipExplanationResetRef.current) {
      skipExplanationResetRef.current = false;
      return;
    }
    explanation.reset();
  }, [proposal, explanation.reset]);

  const onAskAi = useCallback((): void => {
    void explanation.suggestMove().then((picked) => {
      if (picked !== null) {
        skipExplanationResetRef.current = true;
        autopilot.setProposal(picked);
      }
    });
  }, [explanation, autopilot]);

  const policyDecision =
    autopilot.pendingDecision !== null &&
    autopilot.pendingProposal === autopilot.pendingDecision.action
      ? autopilot.pendingDecision
      : null;

  const pendingDecision = autopilot.pendingDecision;
  useEffect(() => {
    if (pendingDecision !== null) rememberHandAdvice(pendingDecision);
  }, [pendingDecision]);
  useEffect(() => () => clearHandAdvice(), []);

  const {
    recorded: feedbackRecorded,
    markRecorded,
    clear: clearFeedbackNotice,
  } = useAdviceFeedbackNotice(isScoring);
  useEffect(() => {
    if (proposal !== null) clearFeedbackNotice();
  }, [proposal, clearFeedbackNotice]);

  const onFeedback = useCallback(
    (correctedIndex: number | null): void => {
      if (policyDecision === null) return;
      captureAdviceFeedback(
        useGame.getState(),
        buildHandPolicyFeedbackEvent(policyDecision, correctedIndex),
      );
      clearHandAdvice();
      markRecorded();
      const corrected =
        correctedIndex !== null
          ? policyDecision.candidates[correctedIndex]
          : undefined;
      if (corrected !== undefined) {
        autopilot.approveOption(corrected);
      } else {
        autopilot.dismissProposal();
      }
    },
    [policyDecision, autopilot, markRecorded],
  );

  const onAgree = useCallback((): void => {
    if (policyDecision !== null) {
      captureAdviceFeedback(
        useGame.getState(),
        buildHandPolicyFeedbackEvent(
          policyDecision,
          policyDecision.recommendationIndex,
          "explicit",
          "good",
        ),
      );
      markRecorded();
    }
    clearHandAdvice();
    autopilot.approve();
  }, [policyDecision, autopilot, markRecorded]);

  const onToggle = useCallback((): void => {
    setEnabled((prev) => !prev);
  }, []);

  return {
    enabled,
    onToggle,
    autopilot,
    explanation: explanation.state,
    onAskAi,
    onFeedback,
    onAgree,
    feedbackRecorded,
    policyDecision,
  };
}
