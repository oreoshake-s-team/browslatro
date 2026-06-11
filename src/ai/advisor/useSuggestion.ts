import { useCallback, useRef, useState } from "react";
import type { Advice } from "./advice";
import {
  fetchContextAdvice,
  type AdviceClientErrorCode,
} from "./client";
import type {
  BlindAdviceCandidate,
  BlindAdviceRequest,
  PackAdviceCandidate,
  PackAdviceRequest,
  ShopAdviceCandidate,
  ShopAdviceRequest,
} from "./types";

export type ContextAdviceCandidate =
  | ShopAdviceCandidate
  | PackAdviceCandidate
  | BlindAdviceCandidate;

export interface SuggestionPlan<TAction> {
  readonly request: ShopAdviceRequest | PackAdviceRequest | BlindAdviceRequest;
  readonly actions: ReadonlyArray<TAction>;
}

export type SuggestionState<TAction> =
  | { readonly phase: "idle" }
  | { readonly phase: "loading" }
  | {
      readonly phase: "ready";
      readonly advice: Advice;
      readonly candidates: ReadonlyArray<ContextAdviceCandidate>;
      readonly actions: ReadonlyArray<TAction>;
    }
  | {
      readonly phase: "error";
      readonly code: AdviceClientErrorCode;
      readonly retryAfterSeconds?: number;
    };

export interface SuggestionDeps {
  readonly fetchAdviceFn: typeof fetchContextAdvice;
}

export interface UseSuggestionResult<TAction> {
  readonly state: SuggestionState<TAction>;
  readonly suggest: () => Promise<void>;
  readonly reset: () => void;
}

export function useSuggestion<TAction>(
  buildPlan: () => SuggestionPlan<TAction> | null,
  deps?: SuggestionDeps,
): UseSuggestionResult<TAction> {
  const [state, setState] = useState<SuggestionState<TAction>>({
    phase: "idle",
  });
  const requestIdRef = useRef(0);
  const buildPlanRef = useRef(buildPlan);
  buildPlanRef.current = buildPlan;
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const suggest = useCallback(async (): Promise<void> => {
    const plan = buildPlanRef.current();
    if (plan === null) return;
    const fetchAdviceFn = depsRef.current?.fetchAdviceFn ?? fetchContextAdvice;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setState({ phase: "loading" });
    const result = await fetchAdviceFn(plan.request);
    if (requestIdRef.current !== requestId) return;
    if (!result.ok) {
      setState({
        phase: "error",
        code: result.code,
        retryAfterSeconds: result.retryAfterSeconds,
      });
      return;
    }
    setState({
      phase: "ready",
      advice: result.advice,
      candidates: plan.request.candidates,
      actions: plan.actions,
    });
  }, []);

  const reset = useCallback((): void => {
    requestIdRef.current += 1;
    setState({ phase: "idle" });
  }, []);

  return { state, suggest, reset };
}
