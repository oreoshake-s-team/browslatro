import type { JokerRarity } from "../items/jokers";
import type { PackPool, PackVariant } from "../items/packs";
import type { RunStats } from "./runStats";

export type ImmediateAction =
  | { readonly kind: "money-per-stat"; readonly stat: keyof RunStats; readonly perUnit: number }
  | { readonly kind: "double-money"; readonly cap: number }
  | { readonly kind: "open-pack"; readonly pool: PackPool; readonly variant: PackVariant }
  | { readonly kind: "create-jokers"; readonly rarity: JokerRarity; readonly count: number };

export type MoneyImmediateAction = Exclude<
  ImmediateAction,
  { kind: "open-pack" } | { kind: "create-jokers" }
>;

export interface ImmediateContext {
  readonly stats: RunStats;
  readonly money: number;
}

export function immediateMoneyGain(
  action: MoneyImmediateAction,
  ctx: ImmediateContext,
): number {
  switch (action.kind) {
    case "money-per-stat":
      return ctx.stats[action.stat] * action.perUnit;
    case "double-money":
      return Math.min(ctx.money, action.cap);
  }
}
