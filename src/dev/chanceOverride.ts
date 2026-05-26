export const chanceOverrideConfig: { force100: boolean } = {
  force100: false,
};

export function rollChance(chance: number, rng: () => number): boolean {
  if (chance <= 0) return false;
  if (chance >= 1) return true;
  if (chanceOverrideConfig.force100) return true;
  return rng() < chance;
}
