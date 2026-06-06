export const chanceOverrideConfig: {
  force100: boolean;
  probabilityMultiplier: number;
} = {
  force100: false,
  probabilityMultiplier: 1,
};

export function rollChance(chance: number, rng: () => number): boolean {
  if (chance <= 0) return false;
  if (chance >= 1) return true;
  if (chanceOverrideConfig.force100) return true;
  const effective = effectiveChance(
    chance,
    chanceOverrideConfig.probabilityMultiplier,
  );
  if (effective >= 1) return true;
  return rng() < effective;
}

export function effectiveChance(baseChance: number, multiplier: number): number {
  if (baseChance <= 0) return 0;
  if (baseChance >= 1) return 1;
  const safeMultiplier = multiplier > 0 ? multiplier : 1;
  return Math.min(1, baseChance * safeMultiplier);
}
