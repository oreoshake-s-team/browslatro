import type { Blind } from "../cards/types";
import {
  BASE_CHIPS,
  BLIND_MULTIPLIERS,
  GREEN_STAKE_CHIPS,
  PURPLE_STAKE_CHIPS,
} from "../constants";
import type { BossBlind } from "../items/bosses";
import { hasStakeModifier, type Stake } from "../items/stakes";

// Balatro's endless-mode formula for antes past the base table:
// floor(a * (1.6 + (0.75c)^d)^c) with a = last table entry, c = antes past
// the table, d = 1 + 0.2c, rounded down to two significant digits.
function endlessChipsForAnte(
  table: ReadonlyArray<number>,
  ante: number,
): number {
  const a = table[table.length - 1];
  const c = ante - table.length;
  const d = 1 + 0.2 * c;
  const amount = Math.floor(a * (1.6 + (0.75 * c) ** d) ** c);
  const magnitude = 10 ** Math.floor(Math.log10(amount) - 1);
  return amount - (amount % magnitude);
}

export function baseChipsForAnte(ante: number, stake?: Stake): number {
  const table =
    stake && hasStakeModifier(stake, "purple-ante-scaling")
      ? PURPLE_STAKE_CHIPS
      : stake && hasStakeModifier(stake, "green-ante-scaling")
        ? GREEN_STAKE_CHIPS
        : BASE_CHIPS;
  if (ante < 1) return 100;
  if (ante <= table.length) return table[ante - 1];
  return endlessChipsForAnte(table, ante);
}

export interface RequiredChipsForBlindArgs {
  readonly ante: number;
  readonly blind: Blind;
  readonly boss: BossBlind;
  readonly stake?: Stake;
}

export function requiredChipsForBlind({
  ante,
  blind,
  boss,
  stake,
}: RequiredChipsForBlindArgs): number {
  const base = baseChipsForAnte(ante, stake);
  if (blind === 3) return base * boss.scoreMultiplier;
  return base * BLIND_MULTIPLIERS[blind - 1];
}
