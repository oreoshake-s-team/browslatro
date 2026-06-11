import { useCallback, useRef, useState } from "react";
import { useGame, type GameState } from "../../store/game";
import { getHandOptions, type HandOption } from "../getHandOptions";
import { toModelState } from "../modelState";
import { createAdvisorRanker, type CandidateRanker } from "../policy";
import type { Advice } from "./advice";
import { fetchAdvice, type AdviceClientErrorCode } from "./client";
import { toModelStateInput, toSimulatePlayInput } from "./snapshot";
import { MAX_CANDIDATES } from "./types";

export const ADVISOR_MODEL_URL = "/models/advisor-policy-v1.onnx";

export type AdvisorDegradedCode = AdviceClientErrorCode | "no_candidates";

export interface AdvisorReport {
  readonly candidates: ReadonlyArray<HandOption>;
  readonly advice: Advice;
}

export type AdvisorState =
  | { readonly phase: "idle" }
  | { readonly phase: "loading" }
  | { readonly phase: "ready"; readonly report: AdvisorReport }
  | { readonly phase: "move-only"; readonly topCandidate: HandOption }
  | {
      readonly phase: "degraded";
      readonly topCandidate: HandOption | null;
      readonly code: AdvisorDegradedCode;
    };

export interface RequestAdviceOptions {
  readonly explain?: boolean;
}

export interface AdvisorDeps {
  readonly ranker: CandidateRanker;
  readonly fetchAdviceFn: typeof fetchAdvice;
  readonly getState: () => GameState;
}

let sharedRanker: CandidateRanker | null = null;

function defaultDeps(): AdvisorDeps {
  sharedRanker = sharedRanker ?? createAdvisorRanker(ADVISOR_MODEL_URL);
  return {
    ranker: sharedRanker,
    fetchAdviceFn: fetchAdvice,
    getState: () => useGame.getState(),
  };
}

export interface UseAdvisorResult {
  readonly state: AdvisorState;
  readonly requestAdvice: (options?: RequestAdviceOptions) => Promise<void>;
  readonly reset: () => void;
}

export function useAdvisor(deps?: AdvisorDeps): UseAdvisorResult {
  const [state, setState] = useState<AdvisorState>({ phase: "idle" });
  const requestIdRef = useRef(0);

  const requestAdvice = useCallback(
    async (options?: RequestAdviceOptions): Promise<void> => {
      const { ranker, fetchAdviceFn, getState } = deps ?? defaultDeps();
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const apply = (next: AdvisorState): void => {
        if (requestIdRef.current === requestId) setState(next);
      };
      apply({ phase: "loading" });
      const game = getState();
      const candidates = getHandOptions(toSimulatePlayInput(game));
      if (candidates.length === 0) {
        apply({ phase: "degraded", topCandidate: null, code: "no_candidates" });
        return;
      }
      const modelState = toModelState(toModelStateInput(game));
      const ranking = await ranker.rank(modelState, candidates);
      const ordered = ranking
        .map((index) => candidates[index])
        .slice(0, MAX_CANDIDATES);
      if (options?.explain === false) {
        apply({ phase: "move-only", topCandidate: ordered[0] });
        return;
      }
      const result = await fetchAdviceFn(modelState, ordered);
      if (!result.ok) {
        apply({ phase: "degraded", topCandidate: ordered[0], code: result.code });
        return;
      }
      apply({
        phase: "ready",
        report: { candidates: ordered, advice: result.advice },
      });
    },
    [deps],
  );

  const reset = useCallback((): void => {
    requestIdRef.current += 1;
    setState({ phase: "idle" });
  }, []);

  return { state, requestAdvice, reset };
}
