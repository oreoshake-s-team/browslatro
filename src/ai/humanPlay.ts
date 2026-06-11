import {
  DATASET_SCHEMA_VERSION,
  sameAction,
  type DatasetRecord,
} from "./dataset";
import { getHandOptions, type HandOption } from "./getHandOptions";
import type { AgentAction } from "./headlessRun";
import { toModelState, type ModelStateInput } from "./modelState";
import {
  MAX_PLAYED_CARDS,
  simulatePlay,
  type SimulatePlayInput,
} from "./simulatePlay";

export type HumanDecisionInput = SimulatePlayInput & ModelStateInput;

const DEFAULT_TOP_N = 3;

function candidateForAction(
  input: HumanDecisionInput,
  action: AgentAction,
): HandOption | null {
  if (action.kind === "discard") {
    if (input.remainingDiscards <= 0) return null;
    if (
      action.cardIds.length === 0 ||
      action.cardIds.length > MAX_PLAYED_CARDS
    ) {
      return null;
    }
    const handIds = new Set(input.dealt.hand.map((c) => c.id));
    if (!action.cardIds.every((id) => handIds.has(id))) return null;
    return { action: "discard", cardIds: action.cardIds, notes: [] };
  }
  const result = simulatePlay(input, action.cardIds);
  if (!result.legal) return null;
  return {
    action: "play",
    cardIds: action.cardIds,
    handLabel: result.handLabel,
    score: result.score,
    chips: result.chips,
    mult: result.mult,
    notes: [],
  };
}

export function recordHumanDecision(
  input: HumanDecisionInput,
  action: AgentAction,
  sessionSeed: number,
  topN: number = DEFAULT_TOP_N,
): DatasetRecord | null {
  const offered = getHandOptions(input, topN);
  let candidates: ReadonlyArray<HandOption> = offered;
  let chosenIndex = offered.findIndex((c) => sameAction(c, action));
  if (chosenIndex === -1) {
    const extra = candidateForAction(input, action);
    if (extra === null) return null;
    candidates = [...offered, extra];
    chosenIndex = candidates.length - 1;
  }
  return {
    schemaVersion: DATASET_SCHEMA_VERSION,
    runSeed: sessionSeed,
    ante: input.ante,
    blind: input.blind,
    state: toModelState(input),
    candidates,
    chosenIndex,
    chosenAction: action,
  };
}
