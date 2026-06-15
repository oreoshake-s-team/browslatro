import type { GameState } from "../../store/game";
import {
  excludeFaceDownCandidates,
  getHandOptions,
  type HandOption,
} from "../getHandOptions";
import { toModelState, type ModelState } from "../modelState";
import type { CandidateRanker } from "../policy";
import { toModelStateInput, toSimulatePlayInput } from "./snapshot";

export interface AutopilotDecision {
  readonly action: HandOption;
  readonly candidates: ReadonlyArray<HandOption>;
  readonly recommendationIndex: number;
  readonly modelState: ModelState;
}

export function autopilotIdle(state: GameState): boolean {
  return (
    state.pendingWin === null &&
    state.pendingLose === null &&
    state.pendingGameWon === null &&
    !state.pendingBlindSelect &&
    !state.pendingRunSelect &&
    state.shopOffers === null &&
    state.openedPack === null &&
    state.remainingHands > 0 &&
    state.dealt.hand.length > 0 &&
    state.discardingIds.size === 0
  );
}

export async function decideAutopilotAction(
  state: GameState,
  ranker: CandidateRanker,
): Promise<AutopilotDecision | null> {
  const candidates = excludeFaceDownCandidates(
    getHandOptions(toSimulatePlayInput(state)),
    state.dealt.hand,
  );
  if (candidates.length === 0) return null;
  const modelState = toModelState(toModelStateInput(state));
  const ranking = await ranker.rank(modelState, candidates);
  const recommendationIndex = ranking[0] ?? 0;
  const action = candidates[recommendationIndex];
  if (action === undefined) return null;
  return { action, candidates, recommendationIndex, modelState };
}

export async function chooseAutopilotAction(
  state: GameState,
  ranker: CandidateRanker,
): Promise<HandOption | null> {
  const decision = await decideAutopilotAction(state, ranker);
  return decision?.action ?? null;
}
