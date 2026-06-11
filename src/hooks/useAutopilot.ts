import { useCallback, useEffect, useRef, useState } from "react";
import {
  autopilotIdle,
  chooseAutopilotAction,
} from "../ai/advisor/autopilot";
import { sharedAdvisorRanker } from "../ai/advisor/useAdvisor";
import { setHumanPlayRecordingSuppressed } from "../ai/humanPlayWiring";
import type { CandidateRanker } from "../ai/policy";
import type { HandOption } from "../ai/getHandOptions";
import { useGame, type GameState } from "../store/game";

export const AUTOPILOT_STEP_MS = 700;

export interface AutopilotExecutor {
  readonly play: () => void;
  readonly discard: () => void;
}

export interface AutopilotDeps {
  readonly ranker: CandidateRanker;
  readonly getState: () => GameState;
  readonly stepMs: number;
}

export interface AutopilotControls {
  readonly pendingProposal: HandOption | null;
  readonly approve: () => void;
  readonly stop: () => void;
}

function defaultDeps(): AutopilotDeps {
  return {
    ranker: sharedAdvisorRanker(),
    getState: () => useGame.getState(),
    stepMs: AUTOPILOT_STEP_MS,
  };
}

export function useAutopilot(
  enabled: boolean,
  isScoring: boolean,
  executor: AutopilotExecutor,
  onStop: () => void,
  deps?: AutopilotDeps,
): AutopilotControls {
  const [pendingProposal, setPendingProposal] = useState<HandOption | null>(null);
  const proposalRef = useRef<HandOption | null>(null);
  proposalRef.current = pendingProposal;
  const executorRef = useRef(executor);
  executorRef.current = executor;
  const onStopRef = useRef(onStop);
  onStopRef.current = onStop;
  const depsRef = useRef(deps);
  depsRef.current = deps;
  const selectedIds = useGame((s) => s.selectedIds);
  const dealt = useGame((s) => s.dealt);
  const remainingHands = useGame((s) => s.remainingHands);
  const pendingWin = useGame((s) => s.pendingWin);
  const pendingBlindSelect = useGame((s) => s.pendingBlindSelect);
  const shopOffers = useGame((s) => s.shopOffers);
  const discardingIds = useGame((s) => s.discardingIds);

  useEffect(() => {
    setHumanPlayRecordingSuppressed(enabled);
    return () => {
      setHumanPlayRecordingSuppressed(false);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setPendingProposal(null);
      return;
    }
    if (isScoring || pendingProposal !== null) return;
    const { ranker, getState, stepMs } = depsRef.current ?? defaultDeps();
    if (!autopilotIdle(getState())) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        const fresh = getState();
        if (cancelled || !autopilotIdle(fresh)) return;
        const action = await chooseAutopilotAction(fresh, ranker);
        if (cancelled || action === null) return;
        fresh.setSelectedIds(new Set(action.cardIds));
        setPendingProposal(action);
      })();
    }, stepMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    enabled,
    isScoring,
    pendingProposal,
    selectedIds,
    dealt,
    remainingHands,
    pendingWin,
    pendingBlindSelect,
    shopOffers,
    discardingIds,
  ]);

  const approve = useCallback((): void => {
    const proposal = proposalRef.current;
    if (proposal === null) return;
    const { getState } = depsRef.current ?? defaultDeps();
    getState().setSelectedIds(new Set(proposal.cardIds));
    setPendingProposal(null);
    if (proposal.action === "play") executorRef.current.play();
    else executorRef.current.discard();
  }, []);

  const stop = useCallback((): void => {
    setPendingProposal(null);
    onStopRef.current();
  }, []);

  return { pendingProposal, approve, stop };
}
