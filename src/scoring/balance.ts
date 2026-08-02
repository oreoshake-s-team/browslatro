export interface BalancedScore {
  readonly chips: number;
  readonly mult: number;
  readonly score: number;
}

export function balanceChipsAndMult(chips: number, mult: number): BalancedScore {
  const balanced = (chips + mult) / 2;
  return { chips: balanced, mult: balanced, score: Math.floor(balanced * balanced) };
}
