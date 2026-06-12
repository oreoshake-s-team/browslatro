import { useCallback, useRef, useState } from "react";
import { useGame, type GameState } from "../../store/game";
import {
  excludeFaceDownCandidates,
  getHandOptions,
  type HandOption,
} from "../getHandOptions";
import { toModelState } from "../modelState";
import type { Advice } from "./advice";
import { fetchAdvice, type AdviceClientErrorCode } from "./client";
import { toModelStateInput, toSimulatePlayInput } from "./snapshot";

export type MoveExplanationState =
  | { readonly phase: "idle" }
  | { readonly phase: "loading" }
  | {
      readonly phase: "ready";
      readonly candidates: ReadonlyArray<HandOption>;
      readonly advice: Advice;
    }
  | {
      readonly phase: "error";
      readonly code: AdviceClientErrorCode;
      readonly retryAfterSeconds?: number;
    };

export interface MoveExplanationDeps {
  readonly fetchAdviceFn: typeof fetchAdvice;
  readonly getState: () => GameState;
}

export interface UseMoveExplanationResult {
  readonly state: MoveExplanationState;
  readonly suggestMove: () => Promise<HandOption | null>;
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

  const suggestMove = useCallback(async (): Promise<HandOption | null> => {
    const { fetchAdviceFn, getState } = deps ?? defaultDeps();
    const game = getState();
    const candidates = excludeFaceDownCandidates(
      getHandOptions(toSimulatePlayInput(game)),
      game.dealt.hand,
    );
    if (candidates.length === 0) return null;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setState({ phase: "loading" });
    const modelState = toModelState(toModelStateInput(game));
    const result = await fetchAdviceFn(modelState, candidates);
    if (requestIdRef.current !== requestId) return null;
    if (!result.ok) {
      setState({
        phase: "error",
        code: result.code,
        retryAfterSeconds: result.retryAfterSeconds,
      });
      return null;
    }
    setState({ phase: "ready", candidates, advice: result.advice });
    return candidates[result.advice.recommendationIndex] ?? null;
  }, [deps]);

  const reset = useCallback((): void => {
    requestIdRef.current += 1;
    setState({ phase: "idle" });
  }, []);

  return { state, suggestMove, reset };
}
