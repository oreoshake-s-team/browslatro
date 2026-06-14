import { playHeadlessRun, type HeadlessAgent } from "../src/ai/headlessRun";
import type { Joker } from "../src/items/jokers/types";
import type { HandStats } from "../src/scoring/handStats";

export interface ShopForwardState {
  readonly ante: number;
  readonly jokers: ReadonlyArray<Joker>;
  readonly handStats: HandStats;
  readonly money: number;
}

export async function scoreShopState(
  state: ShopForwardState,
  agent: HeadlessAgent,
  seeds: ReadonlyArray<number>,
  maxRounds: number,
): Promise<number> {
  if (seeds.length === 0) return 0;
  let total = 0;
  for (const seed of seeds) {
    const result = await playHeadlessRun(agent, {
      seed,
      startAnte: state.ante,
      jokers: state.jokers,
      startHandStats: state.handStats,
      startMoney: state.money,
      maxRounds,
    });
    total += result.blindsCleared;
  }
  return total / seeds.length;
}

export function pickBestState<T>(
  scored: ReadonlyArray<{ readonly item: T; readonly score: number }>,
): number {
  let bestIndex = -1;
  let bestScore = -Infinity;
  scored.forEach(({ score }, index) => {
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}
