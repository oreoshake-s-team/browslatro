import type { HandLabel } from "./handEvaluator";
import { HANDS } from "./constants";

export interface HandStatsEntry {
  readonly chips: number;
  readonly multiplier: number;
}

export type HandStats = Readonly<Record<HandLabel, HandStatsEntry>>;

export function createDefaultHandStats(): HandStats {
  const stats = {} as Record<HandLabel, HandStatsEntry>;
  for (const hand of HANDS) {
    stats[hand.label as HandLabel] = {
      chips: hand.chips,
      multiplier: hand.multiplier,
    };
  }
  return stats;
}
