import type { Deck } from "../items/decks";
import type { Joker } from "../items/jokers/types";
import {
  playHeadlessRun,
  type HeadlessAgent,
  type HeadlessRunResult,
  type HeadlessShopAgent,
} from "./headlessRun";

export interface EvaluateAgentConfig {
  readonly games: number;
  readonly seedOffset?: number;
  readonly maxAnte?: number;
  readonly jokers?: ReadonlyArray<Joker>;
  readonly deck?: Deck;
  readonly shopAgent?: HeadlessShopAgent;
}

export interface EvaluationResult {
  readonly agentName: string;
  readonly games: number;
  readonly wins: number;
  readonly winRate: number;
  readonly averageAnteReached: number;
  readonly averageBlindsCleared: number;
  readonly averageHandsPlayed: number;
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
        shopAgent: config.shopAgent,
      }),
    );
  }
  const wins = results.filter((r) => r.won).length;
  const average = (pick: (r: HeadlessRunResult) => number): number =>
    results.reduce((sum, r) => sum + pick(r), 0) / results.length;
  return {
    agentName,
    games: config.games,
    wins,
    winRate: wins / config.games,
    averageAnteReached: average((r) => r.anteReached),
    averageBlindsCleared: average((r) => r.blindsCleared),
    averageHandsPlayed: average((r) => r.handsPlayed),
  };
}
