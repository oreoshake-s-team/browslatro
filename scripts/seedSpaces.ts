export const BENCHMARK_SEED_BASE = 1_000_000;

export function assertTrainingSeedRange(seedOffset: number, games: number): void {
  if (seedOffset < 0) {
    throw new Error(`seed offset must be non-negative, got ${seedOffset}`);
  }
  const end = seedOffset + games - 1;
  if (end >= BENCHMARK_SEED_BASE) {
    throw new Error(
      `training seeds ${seedOffset}..${end} cross into the benchmark seed space ` +
        `(seeds >= ${BENCHMARK_SEED_BASE} are reserved for evaluation). ` +
        `Keep generated data below ${BENCHMARK_SEED_BASE} so benchmark results ` +
        `are never measured on training seeds.`,
    );
  }
}

export function assertBenchmarkSeedRange(
  seedOffset: number,
  options: { readonly allowTrainingSeeds?: boolean } = {},
): void {
  if (options.allowTrainingSeeds === true) return;
  if (seedOffset < BENCHMARK_SEED_BASE) {
    throw new Error(
      `benchmark seed offset ${seedOffset} is inside the training seed space ` +
        `(seeds below ${BENCHMARK_SEED_BASE} are reserved for dataset generation ` +
        `and self-play). Benchmarking on training seeds measures memorization, ` +
        `not skill. Pass --allow-training-seeds only for a deliberate ` +
        `memorization check.`,
    );
  }
}
