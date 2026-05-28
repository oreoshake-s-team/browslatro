import type { RunStats } from "./runStats";

export type ImmediateAction =
  | { readonly kind: "money-per-stat"; readonly stat: keyof RunStats; readonly perUnit: number }
  | { readonly kind: "double-money"; readonly cap: number };

export interface ImmediateContext {
  readonly stats: RunStats;
  readonly money: number;
}

export function immediateMoneyGain(
  action: ImmediateAction,
  ctx: ImmediateContext,
): number {
  switch (action.kind) {
    case "money-per-stat":
      return ctx.stats[action.stat] * action.perUnit;
    case "double-money":
      return Math.min(ctx.money, action.cap);
  }
}
