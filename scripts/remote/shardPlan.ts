import { sliceJobs, type JobSlice } from "../generateDataset";

export interface RemoteShard {
  readonly index: number;
  readonly games: number;
  readonly seedOffset: number;
  readonly outputKey: string;
}

export interface ShardPlanOptions {
  readonly runId: string;
  readonly totalGames: number;
  readonly machines: number;
  readonly seedOffset?: number;
  readonly keyPrefix?: string;
}

export function planShards(options: ShardPlanOptions): RemoteShard[] {
  const { runId, totalGames, machines } = options;
  if (!/^[A-Za-z0-9._-]+$/.test(runId)) {
    throw new Error(`runId must be a safe object-key segment, got "${runId}"`);
  }
  if (!Number.isInteger(totalGames) || totalGames <= 0) {
    throw new Error(`totalGames must be a positive integer, got ${totalGames}`);
  }
  if (!Number.isInteger(machines) || machines <= 0) {
    throw new Error(`machines must be a positive integer, got ${machines}`);
  }
  const seedOffset = options.seedOffset ?? 0;
  const prefix = options.keyPrefix ?? "datasets";
  const slices: JobSlice[] = sliceJobs(totalGames, seedOffset, machines);
  return slices.map((slice, index) => ({
    index,
    games: slice.games,
    seedOffset: slice.seedOffset,
    outputKey: `${prefix}/${runId}/shard-${index}.jsonl`,
  }));
}
