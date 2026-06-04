import type { Blind } from "../cards/types";
import { BASE_CHIPS, BLIND_MULTIPLIERS, GREEN_STAKE_CHIPS } from "../constants";
import type { BossBlind } from "../items/bosses";
import { hasStakeModifier, type Stake } from "../items/stakes";

export function baseChipsForAnte(ante: number, stake?: Stake): number {
  const index = ante - 1;
  if (stake && hasStakeModifier(stake, "green-ante-scaling")) {
    return GREEN_STAKE_CHIPS[index];
  }
  return BASE_CHIPS[index];
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
