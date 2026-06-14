import { playHeadlessRun, type HeadlessAgent } from "../src/ai/headlessRun";
import { MAX_JOKERS } from "../src/items/jokers/constants";
import type { Joker } from "../src/items/jokers/types";
import { applyPlanetUpgrade } from "../src/items/planets";
import type { ShopItem } from "../src/items/shop";
import type { HandStats } from "../src/scoring/handStats";

export interface ShopForwardState {
  readonly ante: number;
  readonly jokers: ReadonlyArray<Joker>;
  readonly handStats: HandStats;
  readonly money: number;
}

export function applyShopBuy(
  state: ShopForwardState,
  item: ShopItem,
): ShopForwardState {
  const money = state.money - item.price;
  if (item.kind === "joker" && state.jokers.length < MAX_JOKERS) {
    return { ...state, money, jokers: [...state.jokers, item.joker] };
  }
  if (item.kind === "planet") {
    return {
      ...state,
      money,
      handStats: applyPlanetUpgrade(state.handStats, item.planet),
    };
  }
  return { ...state, money };
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

export interface RolloutConfig {
  readonly agent: HeadlessAgent;
  readonly seeds: ReadonlyArray<number>;
  readonly maxRounds: number;
}

export async function labelByRollout(
  candidates: ReadonlyArray<ShopForwardState>,
  config: RolloutConfig,
): Promise<number> {
  const scored: Array<{ readonly item: number; readonly score: number }> = [];
  for (let i = 0; i < candidates.length; i += 1) {
    scored.push({
      item: i,
      score: await scoreShopState(
        candidates[i],
        config.agent,
        config.seeds,
        config.maxRounds,
      ),
    });
  }
  return pickBestState(scored);
}
