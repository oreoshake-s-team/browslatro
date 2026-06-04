export interface RngConfig {
  rng: () => number;
  reset(): void;
}

const REGISTRY: RngConfig[] = [];

export function createRngConfig(
  defaultRng: () => number = Math.random,
): RngConfig {
  const cfg: RngConfig = {
    rng: defaultRng,
    reset() {
      cfg.rng = defaultRng;
    },
  };
  REGISTRY.push(cfg);
  return cfg;
}

export function resetAllRngConfigs(): void {
  for (const cfg of REGISTRY) cfg.reset();
}
