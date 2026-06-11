import { useEffect, useRef } from "react";
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

function defaultDeps(): AutopilotDeps {
  return {
    ranker: sharedAdvisorRanker(),
    getState: () => useGame.getState(),
    stepMs: AUTOPILOT_STEP_MS,
  };
}

function selectionMatches(
  plan: HandOption,
  selectedIds: ReadonlySet<number>,
): boolean {
  return (
    plan.cardIds.length === selectedIds.size &&
    plan.cardIds.every((id) => selectedIds.has(id))
  );
}

export function useAutopilot(
  enabled: boolean,
  isScoring: boolean,
  executor: AutopilotExecutor,
  deps?: AutopilotDeps,
): void {
  const planRef = useRef<HandOption | null>(null);
  const executorRef = useRef(executor);
  executorRef.current = executor;
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
    const { ranker, getState, stepMs } = depsRef.current ?? defaultDeps();
    if (!enabled) {
      planRef.current = null;
      return;
    }
    if (isScoring) return;
    const state = getState();
    if (!autopilotIdle(state)) return;
    const plan = planRef.current;
    if (plan !== null && selectionMatches(plan, state.selectedIds)) {
      planRef.current = null;
      if (plan.action === "play") executorRef.current.play();
      else executorRef.current.discard();
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        const fresh = getState();
        if (cancelled || !autopilotIdle(fresh)) return;
        const action = await chooseAutopilotAction(fresh, ranker);
        if (cancelled || action === null) return;
        planRef.current = action;
        fresh.setSelectedIds(new Set(action.cardIds));
      })();
    }, stepMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    enabled,
    isScoring,
    selectedIds,
    dealt,
    remainingHands,
    pendingWin,
    pendingBlindSelect,
    shopOffers,
    discardingIds,
  ]);
}
