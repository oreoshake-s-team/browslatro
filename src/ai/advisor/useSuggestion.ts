import { useCallback, useRef, useState } from "react";
import type { Advice } from "./advice";
import {
  fetchContextAdvice,
  type AdviceClientErrorCode,
} from "./client";
import type {
  PackAdviceCandidate,
  PackAdviceRequest,
  ShopAdviceCandidate,
  ShopAdviceRequest,
} from "./types";

export type ContextAdviceCandidate =
  | ShopAdviceCandidate
  | PackAdviceCandidate;

export interface SuggestionPlan<TAction> {
  readonly request: ShopAdviceRequest | PackAdviceRequest;
  readonly actions: ReadonlyArray<TAction>;
}

interface SuggestionContext<TAction> {
  readonly onnxIndex: number | null;
  readonly candidates: ReadonlyArray<ContextAdviceCandidate>;
  readonly actions: ReadonlyArray<TAction>;
}

export type SuggestionState<TAction> =
  | { readonly phase: "idle" }
  | ({ readonly phase: "loading" } & SuggestionContext<TAction>)
  | ({ readonly phase: "coach" } & SuggestionContext<TAction>)
  | ({ readonly phase: "asking" } & SuggestionContext<TAction>)
  | ({ readonly phase: "ready"; readonly advice: Advice } & SuggestionContext<TAction>)
  | ({
      readonly phase: "error";
      readonly code: AdviceClientErrorCode;
      readonly retryAfterSeconds?: number;
    } & SuggestionContext<TAction>);

export interface SuggestionDeps {
  readonly fetchAdviceFn: typeof fetchContextAdvice;
}

export interface UseSuggestionResult<TAction> {
  readonly state: SuggestionState<TAction>;
  readonly suggest: () => Promise<void>;
  readonly coach: () => Promise<void>;
  readonly askAi: () => Promise<void>;
  readonly reset: () => void;
}

export function useSuggestion<TAction>(
  buildPlan: () => SuggestionPlan<TAction> | null,
  deps?: SuggestionDeps,
  preRank?: (candidates: ReadonlyArray<ContextAdviceCandidate>) => Promise<number | null>,
): UseSuggestionResult<TAction> {
  const [state, setState] = useState<SuggestionState<TAction>>({
    phase: "idle",
  });
  const requestIdRef = useRef(0);
  const onnxIndexRef = useRef<number | null>(null);
  const buildPlanRef = useRef(buildPlan);
  buildPlanRef.current = buildPlan;
  const depsRef = useRef(deps);
  depsRef.current = deps;
  const preRankRef = useRef(preRank);
  preRankRef.current = preRank;

  const suggest = useCallback(async (): Promise<void> => {
    const plan = buildPlanRef.current();
    if (plan === null) return;
    const fetchAdviceFn = depsRef.current?.fetchAdviceFn ?? fetchContextAdvice;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const candidates = plan.request.candidates;
    const actions = plan.actions;
    setState({ phase: "loading", onnxIndex: null, candidates, actions });

    if (preRankRef.current) {
      const rank = preRankRef.current;
      void rank(candidates).then((idx) => {
        if (requestIdRef.current !== requestId) return;
        setState((s) => (s.phase === "loading" ? { ...s, onnxIndex: idx } : s));
      }).catch(() => undefined);
    }

    const result = await fetchAdviceFn(plan.request);
    if (requestIdRef.current !== requestId) return;
    if (!result.ok) {
      setState({
        phase: "error",
        code: result.code,
        retryAfterSeconds: result.retryAfterSeconds,
        onnxIndex: null,
        candidates,
        actions,
      });
      return;
    }
    setState({ phase: "ready", advice: result.advice, onnxIndex: null, candidates, actions });
  }, []);

  const coach = useCallback(async (): Promise<void> => {
    const plan = buildPlanRef.current();
    if (plan === null) return;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const candidates = plan.request.candidates;
    const actions = plan.actions;
    onnxIndexRef.current = null;
    setState({ phase: "coach", onnxIndex: null, candidates, actions });

    const rank = preRankRef.current;
    if (!rank) return;
    let idx: number | null = null;
    try {
      idx = await rank(candidates);
    } catch {
      idx = null;
    }
    if (requestIdRef.current !== requestId) return;
    onnxIndexRef.current = idx;
    setState((s) => (s.phase === "coach" ? { ...s, onnxIndex: idx } : s));
  }, []);

  const askAi = useCallback(async (): Promise<void> => {
    const plan = buildPlanRef.current();
    if (plan === null) return;
    const fetchAdviceFn = depsRef.current?.fetchAdviceFn ?? fetchContextAdvice;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const candidates = plan.request.candidates;
    const actions = plan.actions;
    const onnxIndex = onnxIndexRef.current;
    setState({ phase: "asking", onnxIndex, candidates, actions });

    const result = await fetchAdviceFn(plan.request);
    if (requestIdRef.current !== requestId) return;
    if (!result.ok) {
      setState({
        phase: "error",
        code: result.code,
        retryAfterSeconds: result.retryAfterSeconds,
        onnxIndex,
        candidates,
        actions,
      });
      return;
    }
    setState({ phase: "ready", advice: result.advice, onnxIndex, candidates, actions });
  }, []);

  const reset = useCallback((): void => {
    requestIdRef.current += 1;
    onnxIndexRef.current = null;
    setState({ phase: "idle" });
  }, []);

  return { state, suggest, coach, askAi, reset };
}
