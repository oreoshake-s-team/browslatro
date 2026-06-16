import type { GameState } from "../../store/game";
import type { HandOption } from "../getHandOptions";
import { captureAdviceFeedback } from "../humanPlayWiring";
import { buildHandPolicyFeedbackEvent } from "./adviceFeedback";
import type { AutopilotDecision } from "./autopilot";

export interface CommittedHandMove {
  readonly action: "play" | "discard";
  readonly cardIds: ReadonlyArray<number>;
}

let shown: AutopilotDecision | null = null;

export function rememberHandAdvice(decision: AutopilotDecision): void {
  shown = decision;
}

export function clearHandAdvice(): void {
  shown = null;
}

function sameMove(candidate: HandOption, committed: CommittedHandMove): boolean {
  if (candidate.action !== committed.action) return false;
  if (candidate.cardIds.length !== committed.cardIds.length) return false;
  const ids = new Set(committed.cardIds);
  return candidate.cardIds.every((id) => ids.has(id));
}

export function matchedHandDisagreement(
  committed: CommittedHandMove,
): { readonly decision: AutopilotDecision; readonly correctedIndex: number } | null {
  if (shown === null) return null;
  const index = shown.candidates.findIndex((c) => sameMove(c, committed));
  if (index < 0 || index === shown.recommendationIndex) return null;
  return { decision: shown, correctedIndex: index };
}

export function recordHandDisagreement(
  committed: CommittedHandMove,
  state: GameState,
): void {
  const match = matchedHandDisagreement(committed);
  clearHandAdvice();
  if (match === null) return;
  captureAdviceFeedback(
    state,
    buildHandPolicyFeedbackEvent(
      match.decision,
      match.correctedIndex,
      "auto-disagreement",
    ),
  );
}
