import { FINAL_ANTE } from "../constants";
import type { Deck } from "../items/decks";
import type { Joker } from "../items/jokers/types";
import type { Stake } from "../items/stakes";
import {
  playHeadlessRun,
  type HeadlessAgent,
  type HeadlessRunResult,
  type HeadlessShopAgent,
} from "./headlessRun";
import {
  lossHistogram,
  summarize,
  winRateStandardError,
  type AnteCount,
  type Distribution,
} from "./evaluationStats";
import { averageShopActivity, type ShopActivity } from "./shopActivity";

export interface EvaluateAgentConfig {
  readonly games: number;
  readonly seedOffset?: number;
  readonly maxAnte?: number;
  readonly jokers?: ReadonlyArray<Joker>;
  readonly deck?: Deck;
  readonly stake?: Stake;
  readonly shopAgent?: HeadlessShopAgent;
}

export interface EvaluationResult {
  readonly agentName: string;
  readonly games: number;
  readonly wins: number;
  readonly winRate: number;
  readonly winRateStdErr: number;
  readonly reachedFinalAnte: number;
  readonly averageAnteReached: number;
  readonly averageBlindsCleared: number;
  readonly averageHandsPlayed: number;
  readonly averageBlindsSkipped: number;
  readonly anteReached: Distribution;
  readonly blindsCleared: Distribution;
  readonly handsPlayed: Distribution;
  readonly blindsSkipped: Distribution;
  readonly finalMoney: Distribution;
  readonly lossAnteHistogram: ReadonlyArray<AnteCount>;
  readonly shopActivity: ShopActivity;
}

export async function evaluateAgent(
  agentForSeed: (seed: number) => HeadlessAgent,
  config: EvaluateAgentConfig,
): Promise<EvaluationResult> {
  if (config.games <= 0) {
    throw new Error(`games must be positive, got ${config.games}`);
  }
  const seedOffset = config.seedOffset ?? 0;
  const results: HeadlessRunResult[] = [];
  let agentName = "";
  for (let game = 0; game < config.games; game += 1) {
    const seed = seedOffset + game;
    const agent = agentForSeed(seed);
    agentName = agent.name;
    results.push(
      await playHeadlessRun(agent, {
        seed,
        maxAnte: config.maxAnte,
        jokers: config.jokers,
        deck: config.deck,
        stake: config.stake,
        shopAgent: config.shopAgent,
      }),
    );
  }
  const wins = results.filter((r) => r.won).length;
  const maxAnte = config.maxAnte ?? FINAL_ANTE;
  const distribution = (pick: (r: HeadlessRunResult) => number): Distribution =>
    summarize(results.map(pick));
  const anteReached = distribution((r) => r.anteReached);
  const blindsCleared = distribution((r) => r.blindsCleared);
  const handsPlayed = distribution((r) => r.handsPlayed);
  const blindsSkipped = distribution((r) => r.blindsSkipped);
  const finalMoney = distribution((r) => r.finalMoney);
  return {
    agentName,
    games: config.games,
    wins,
    winRate: wins / config.games,
    winRateStdErr: winRateStandardError(wins, config.games),
    reachedFinalAnte: results.filter((r) => r.anteReached >= maxAnte).length,
    averageAnteReached: anteReached.mean,
    averageBlindsCleared: blindsCleared.mean,
    averageHandsPlayed: handsPlayed.mean,
    averageBlindsSkipped: blindsSkipped.mean,
    anteReached,
    blindsCleared,
    handsPlayed,
    blindsSkipped,
    finalMoney,
    lossAnteHistogram: lossHistogram(
      results.filter((r) => !r.won).map((r) => r.anteReached),
    ),
    shopActivity: averageShopActivity(results.map((r) => r.shopActivity)),
  };
}
