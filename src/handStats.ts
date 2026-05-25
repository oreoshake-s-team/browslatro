import type { HandLabel } from "./handEvaluator";
import { HANDS } from "./constants";

export interface HandStatsEntry {
  readonly chips: number;
  readonly multiplier: number;
  readonly level: number;
}

export type HandStats = Readonly<Record<HandLabel, HandStatsEntry>>;

export function createDefaultHandStats(): HandStats {
  const stats = {} as Record<HandLabel, HandStatsEntry>;
  for (const hand of HANDS) {
    stats[hand.label as HandLabel] = {
      chips: hand.chips,
      multiplier: hand.multiplier,
      level: 1,
    };
  }
  return stats;
}
