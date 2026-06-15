import { useCallback, useEffect, useRef, useState } from "react";
import {
  autopilotIdle,
  decideAutopilotAction,
  type AutopilotDecision,
} from "../ai/advisor/autopilot";
import { sharedAdvisorRanker } from "../ai/advisor/advisorRanker";
import { setHumanPlayRecordingSuppressed } from "../ai/humanPlayWiring";
import { fakeAutopilotPolicyEnabled } from "../dev/fakeAutopilotPolicy";
import { greedyRanker, type CandidateRanker, type DownloadProgress } from "../ai/policy";
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
  readonly pendingDecision: AutopilotDecision | null;
  readonly modelProgress: DownloadProgress | null;
  readonly proposalUnavailable: boolean;
  readonly approve: () => void;
  readonly stop: () => void;
  readonly dismissProposal: () => void;
  readonly setProposal: (option: HandOption) => void;
}

function defaultDeps(): AutopilotDeps {
  return {
    ranker: fakeAutopilotPolicyEnabled() ? greedyRanker() : sharedAdvisorRanker(),
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
  const [pendingDecision, setPendingDecision] =
    useState<AutopilotDecision | null>(null);
  const [modelProgress, setModelProgress] = useState<DownloadProgress | null>(
    null,
  );
  const [proposalUnavailable, setProposalUnavailable] = useState(false);
  const modelLoadedRef = useRef(false);
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
      setPendingDecision(null);
      setModelProgress(null);
      setProposalUnavailable(false);
      return;
    }
    if (isScoring || pendingProposal !== null) return;
    const { ranker, getState, stepMs } = depsRef.current ?? defaultDeps();
    if (!autopilotIdle(getState())) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        if (cancelled || !autopilotIdle(getState())) return;
        if (!modelLoadedRef.current) {
          setModelProgress({ loaded: 0, total: null });
          await ranker.load((progress) => {
            if (!cancelled) setModelProgress(progress);
          });
          if (cancelled) return;
          modelLoadedRef.current = true;
          setModelProgress(null);
        }
        const fresh = getState();
        if (cancelled || !autopilotIdle(fresh)) return;
        const decision = await decideAutopilotAction(fresh, ranker);
        if (cancelled) return;
        if (decision === null) {
          setProposalUnavailable(true);
          return;
        }
        setProposalUnavailable(false);
        fresh.selectCards(decision.action.cardIds);
        setPendingDecision(decision);
        setPendingProposal(decision.action);
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

  useEffect(() => {
    if (pendingProposal === null) return;
    const proposed = pendingProposal.cardIds;
    const selectionMatches =
      selectedIds.size === proposed.length &&
      proposed.every((id) => selectedIds.has(id));
    if (selectionMatches) return;
    setPendingProposal(null);
    setPendingDecision(null);
    setModelProgress(null);
    onStopRef.current();
  }, [selectedIds, pendingProposal]);

  const approve = useCallback((): void => {
    const proposal = proposalRef.current;
    if (proposal === null) return;
    const { getState } = depsRef.current ?? defaultDeps();
    getState().selectCards(proposal.cardIds);
    setPendingProposal(null);
    setPendingDecision(null);
    setModelProgress(null);
    if (proposal.action === "play") executorRef.current.play();
    else executorRef.current.discard();
    onStopRef.current();
  }, []);

  const stop = useCallback((): void => {
    setPendingProposal(null);
    setPendingDecision(null);
    setModelProgress(null);
    onStopRef.current();
  }, []);

  const dismissProposal = useCallback((): void => {
    setPendingProposal(null);
    setPendingDecision(null);
    setModelProgress(null);
  }, []);

  const setProposal = useCallback((option: HandOption): void => {
    const { getState } = depsRef.current ?? defaultDeps();
    getState().selectCards(option.cardIds);
    setPendingProposal(option);
  }, []);

  return {
    pendingProposal,
    pendingDecision,
    modelProgress,
    proposalUnavailable,
    approve,
    stop,
    dismissProposal,
    setProposal,
  };
}
