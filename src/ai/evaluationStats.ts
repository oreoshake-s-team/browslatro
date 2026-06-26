export interface Distribution {
  readonly mean: number;
  readonly min: number;
  readonly max: number;
  readonly median: number;
  readonly p25: number;
  readonly p75: number;
  readonly stdDev: number;
}

export function percentile(sorted: ReadonlyArray<number>, quantile: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * quantile;
  const low = Math.floor(position);
  const high = Math.ceil(position);
  if (low === high) return sorted[low];
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}

export function summarize(values: ReadonlyArray<number>): Distribution {
  if (values.length === 0) {
    return { mean: 0, min: 0, max: 0, median: 0, p25: 0, p75: 0, stdDev: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  const variance =
    sorted.reduce((sum, value) => sum + (value - mean) ** 2, 0) / sorted.length;
  return {
    mean,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: percentile(sorted, 0.5),
    p25: percentile(sorted, 0.25),
    p75: percentile(sorted, 0.75),
    stdDev: Math.sqrt(variance),
  };
}

export function winRateStandardError(wins: number, games: number): number {
  if (games <= 0) return 0;
  const rate = wins / games;
  return Math.sqrt((rate * (1 - rate)) / games);
}

export interface AnteCount {
  readonly ante: number;
  readonly count: number;
}

export function lossHistogram(
  antesReached: ReadonlyArray<number>,
): ReadonlyArray<AnteCount> {
  const counts = new Map<number, number>();
  for (const ante of antesReached) {
    counts.set(ante, (counts.get(ante) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([ante, count]) => ({ ante, count }))
    .sort((a, b) => a.ante - b.ante);
}
