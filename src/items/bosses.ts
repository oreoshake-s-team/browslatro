export interface BossBlind {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly scoreMultiplier: number;
  readonly anteMin: number;
}

const BOSS_SPECS: ReadonlyArray<BossBlind> = [
  {
    id: "boss-default",
    name: "Boss Blind",
    description: "A standard boss blind. Score at least the required chips.",
    scoreMultiplier: 2,
    anteMin: 1,
  },
  {
    id: "the-wall",
    name: "The Wall",
    description: "Extra large blind requirement.",
    scoreMultiplier: 4,
    anteMin: 2,
  },
];

export function createBossCatalog(): BossBlind[] {
  return BOSS_SPECS.slice();
}

export function availableBosses(
  catalog: ReadonlyArray<BossBlind>,
  ante: number,
): BossBlind[] {
  return catalog.filter((b) => ante >= b.anteMin);
}

export type BossRandomSource = () => number;

export const bossPickerRngConfig: { rng: BossRandomSource } = {
  rng: Math.random,
};

export interface PickBossArgs {
  readonly ante: number;
  readonly recentIds?: ReadonlySet<string>;
  readonly catalog?: ReadonlyArray<BossBlind>;
  readonly rng?: BossRandomSource;
}

export function pickBossForAnte(args: PickBossArgs): BossBlind {
  const catalog = args.catalog ?? createBossCatalog();
  const rng = args.rng ?? bossPickerRngConfig.rng;
  const eligible = availableBosses(catalog, args.ante);
  if (eligible.length === 0) {
    throw new Error(`No boss available for ante ${args.ante}`);
  }
  const recent = args.recentIds ?? new Set<string>();
  const fresh = eligible.filter((b) => !recent.has(b.id));
  const pool = fresh.length > 0 ? fresh : eligible;
  return pool[Math.floor(rng() * pool.length)];
}
