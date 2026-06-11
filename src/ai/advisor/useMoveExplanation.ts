import { useCallback, useRef, useState } from "react";
import { useGame, type GameState } from "../../store/game";
import type { HandOption } from "../getHandOptions";
import { toModelState } from "../modelState";
import { fetchAdvice, type AdviceClientErrorCode } from "./client";
import { toModelStateInput } from "./snapshot";

export type MoveExplanationState =
  | { readonly phase: "idle" }
  | { readonly phase: "loading" }
  | { readonly phase: "ready"; readonly explanation: string; readonly concept: string }
  | { readonly phase: "error"; readonly code: AdviceClientErrorCode };

export interface MoveExplanationDeps {
  readonly fetchAdviceFn: typeof fetchAdvice;
  readonly getState: () => GameState;
}

export interface UseMoveExplanationResult {
  readonly state: MoveExplanationState;
  readonly explain: (proposal: HandOption) => Promise<void>;
  readonly reset: () => void;
}

function defaultDeps(): MoveExplanationDeps {
  return { fetchAdviceFn: fetchAdvice, getState: () => useGame.getState() };
}

export function useMoveExplanation(
  deps?: MoveExplanationDeps,
): UseMoveExplanationResult {
  const [state, setState] = useState<MoveExplanationState>({ phase: "idle" });
  const requestIdRef = useRef(0);

  const explain = useCallback(
    async (proposal: HandOption): Promise<void> => {
      const { fetchAdviceFn, getState } = deps ?? defaultDeps();
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setState({ phase: "loading" });
      const modelState = toModelState(toModelStateInput(getState()));
      const result = await fetchAdviceFn(modelState, [proposal]);
      if (requestIdRef.current !== requestId) return;
      if (!result.ok) {
        setState({ phase: "error", code: result.code });
        return;
      }
      setState({
        phase: "ready",
        explanation: result.advice.explanation,
        concept: result.advice.concept,
      });
    },
    [deps],
  );

  const reset = useCallback((): void => {
    requestIdRef.current += 1;
    setState({ phase: "idle" });
  }, []);

  return { state, explain, reset };
}
