export interface RunStats {
  readonly handsPlayed: number;
  readonly unusedDiscards: number;
  readonly blindsSkipped: number;
}

export function initialRunStats(): RunStats {
  return { handsPlayed: 0, unusedDiscards: 0, blindsSkipped: 0 };
}

export function recordHandPlayed(stats: RunStats): RunStats {
  return { ...stats, handsPlayed: stats.handsPlayed + 1 };
}

export function recordUnusedDiscards(stats: RunStats, remaining: number): RunStats {
  return { ...stats, unusedDiscards: stats.unusedDiscards + Math.max(0, remaining) };
}

export function recordBlindSkipped(stats: RunStats): RunStats {
  return { ...stats, blindsSkipped: stats.blindsSkipped + 1 };
}
