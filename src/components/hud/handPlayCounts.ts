import { HANDS } from "../../constants";
import type { HandLabel } from "../../scoring/handEvaluator";

export type HandPlayCounts = Readonly<Record<HandLabel, number>>;

export function emptyHandCounts(): HandPlayCounts {
  const counts = {} as Record<HandLabel, number>;
  for (const hand of HANDS) {
    counts[hand.label as HandLabel] = 0;
  }
  return counts;
}
