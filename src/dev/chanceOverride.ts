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
  const multiplier =
    chanceOverrideConfig.probabilityMultiplier > 0
      ? chanceOverrideConfig.probabilityMultiplier
      : 1;
  const effective = Math.min(1, chance * multiplier);
  if (effective >= 1) return true;
  return rng() < effective;
}
