import type { GameState } from "../../store/game";
import { getHandOptions, type HandOption } from "../getHandOptions";
import { toModelState } from "../modelState";
import type { CandidateRanker } from "../policy";
import { toModelStateInput, toSimulatePlayInput } from "./snapshot";

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

export async function chooseAutopilotAction(
  state: GameState,
  ranker: CandidateRanker,
): Promise<HandOption | null> {
  const candidates = getHandOptions(toSimulatePlayInput(state));
  if (candidates.length === 0) return null;
  const ranking = await ranker.rank(
    toModelState(toModelStateInput(state)),
    candidates,
  );
  return candidates[ranking[0]] ?? null;
}
