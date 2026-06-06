import { handContains, type HandLabel } from "../../scoring/handEvaluator";
import type { Joker, JokerStateValue } from "./types";

function counterState(value: number): JokerStateValue {
  return { kind: "counter", value };
}

export function applyHandPlayedToJokerStates(
  jokers: ReadonlyArray<Joker>,
  playedHandLabel: HandLabel,
): Joker[] {
  return jokers.map((joker) => {
    const effect = joker.effect;
    if (effect.kind !== "on-hand-type-stack-mult") return joker;
    if (!handContains(playedHandLabel, effect.requires)) return joker;
    const prev = joker.state?.kind === "counter" ? joker.state.value : 0;
    return { ...joker, state: counterState(prev + effect.amount) };
  });
}
