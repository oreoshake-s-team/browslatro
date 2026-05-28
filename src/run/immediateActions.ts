import type { RunStats } from "./runStats";

export type ImmediateAction = {
  readonly kind: "money-per-stat";
  readonly stat: keyof RunStats;
  readonly perUnit: number;
};

export function immediateMoneyGain(
  action: ImmediateAction,
  stats: RunStats,
): number {
  switch (action.kind) {
    case "money-per-stat":
      return stats[action.stat] * action.perUnit;
  }
}
