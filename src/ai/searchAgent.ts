import { shuffle } from "../cards/deck";
import type { RandomSource } from "../items/jokers/types";
import { getHandOptions, type HandOption } from "./getHandOptions";
import {
  removeAndRefill,
  type AgentAction,
  type HeadlessAgent,
  type HeadlessRoundView,
  type Pile,
} from "./headlessRun";
import { simulatePlay } from "./simulatePlay";

export interface SearchAgentConfig {
  readonly rng: RandomSource;
  readonly rollouts?: number;
  readonly topN?: number;
}

const DEFAULT_ROLLOUTS = 4;
const DEFAULT_TOP_N = 3;
const CLEARED_HAND_BONUS = 0.01;

interface RoundPosition {
  readonly pile: Pile;
  readonly remainingHands: number;
  readonly remainingDiscards: number;
  readonly roundScore: number;
}

function viewAt(
  view: HeadlessRoundView,
  position: RoundPosition,
): HeadlessRoundView {
  return {
    ...view,
    dealt: position.pile,
    remainingHands: position.remainingHands,
    remainingDiscards: position.remainingDiscards,
    roundScore: position.roundScore,
  };
}

function applyAction(
  view: HeadlessRoundView,
  position: RoundPosition,
  action: AgentAction,
): RoundPosition | null {
  if (action.kind === "discard") {
    if (position.remainingDiscards <= 0) return null;
    return {
      ...position,
      pile: removeAndRefill(position.pile, action.cardIds),
      remainingDiscards: position.remainingDiscards - 1,
    };
  }
  if (action.kind === "skip") return null;
  const result = simulatePlay(viewAt(view, position), action.cardIds);
  if (!result.legal) return null;
  return {
    pile: removeAndRefill(position.pile, action.cardIds),
    remainingHands: position.remainingHands - 1,
    remainingDiscards: position.remainingDiscards,
    roundScore: position.roundScore + result.score,
  };
}

export function greedyAction(view: HeadlessRoundView): AgentAction | null {
  if (view.dealt.hand.length === 0) return null;
  const best = getHandOptions(view, 1).find((o) => o.action === "play");
  if (best !== undefined) return { kind: "play", cardIds: best.cardIds };
  if (view.remainingDiscards > 0) {
    return { kind: "discard", cardIds: [view.dealt.hand[0].id] };
  }
  return null;
}

function rolloutValue(
  view: HeadlessRoundView,
  start: RoundPosition,
): number {
  let position = start;
  while (
    position.roundScore < view.scoreTarget &&
    position.remainingHands > 0
  ) {
    const action = greedyAction(viewAt(view, position));
    if (action === null) break;
    const next = applyAction(view, position, action);
    if (next === null) break;
    position = next;
  }
  if (position.roundScore >= view.scoreTarget) {
    return 1 + position.remainingHands * CLEARED_HAND_BONUS;
  }
  return position.roundScore / view.scoreTarget;
}

function withShuffledUnseen(
  position: RoundPosition,
  rng: RandomSource,
): RoundPosition {
  return {
    ...position,
    pile: {
      hand: position.pile.hand,
      remaining: shuffle(position.pile.remaining, rng),
    },
  };
}

export function estimateWinnable(
  view: HeadlessRoundView,
  rng: RandomSource,
  rollouts: number = DEFAULT_ROLLOUTS,
): boolean {
  const start: RoundPosition = {
    pile: view.dealt,
    remainingHands: view.remainingHands,
    remainingDiscards: view.remainingDiscards,
    roundScore: view.roundScore,
  };
  let clears = 0;
  for (let i = 0; i < rollouts; i += 1) {
    if (rolloutValue(view, withShuffledUnseen(start, rng)) >= 1) clears += 1;
  }
  return clears * 2 >= rollouts;
}

export function createSearchAgent(config: SearchAgentConfig): HeadlessAgent {
  const rollouts = config.rollouts ?? DEFAULT_ROLLOUTS;
  const topN = config.topN ?? DEFAULT_TOP_N;
  const rng = config.rng;
  return {
    name: "search",
    chooseAction(view: HeadlessRoundView): AgentAction {
      const candidates: ReadonlyArray<HandOption> = getHandOptions(view, topN);
      const start: RoundPosition = {
        pile: view.dealt,
        remainingHands: view.remainingHands,
        remainingDiscards: view.remainingDiscards,
        roundScore: view.roundScore,
      };
      let bestAction: AgentAction | null = null;
      let bestValue = -Infinity;
      for (const candidate of candidates) {
        const action: AgentAction =
          candidate.action === "play"
            ? { kind: "play", cardIds: candidate.cardIds }
            : { kind: "discard", cardIds: candidate.cardIds };
        let total = 0;
        let valid = true;
        for (let i = 0; i < rollouts; i += 1) {
          const next = applyAction(
            view,
            withShuffledUnseen(start, rng),
            action,
          );
          if (next === null) {
            valid = false;
            break;
          }
          total += rolloutValue(view, next);
        }
        if (!valid) continue;
        const value = total / rollouts;
        if (value > bestValue) {
          bestValue = value;
          bestAction = action;
        }
      }
      if (bestAction !== null) return bestAction;
      const fallback = greedyAction(view);
      if (fallback !== null) return fallback;
      return { kind: "play", cardIds: [view.dealt.hand[0].id] };
    },
  };
}
