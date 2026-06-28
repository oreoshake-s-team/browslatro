import {
  createJollyJoker,
  createSlyJoker,
  createTheDuoJoker,
  createTheTrioJoker,
  createWilyJoker,
  createZanyJoker,
} from "../items/jokers/factories";
import type { Joker } from "../items/jokers/types";
import {
  applyPlanetUpgrade,
  createPlanetCatalog,
  type PlanetCard,
} from "../items/planets";
import { createDefaultHandStats, type HandStats } from "../scoring/handStats";

export interface SeededBuild {
  readonly jokers: ReadonlyArray<Joker>;
  readonly handStats: HandStats;
}

const PLANETS = createPlanetCatalog();

function planet(id: string): PlanetCard {
  const found = PLANETS.find((p) => p.id === id);
  if (found === undefined) throw new Error(`expected planet ${id}`);
  return found;
}

function leveled(planetId: string, levels: number): HandStats {
  const card = planet(planetId);
  let stats = createDefaultHandStats();
  for (let i = 0; i < levels; i += 1) stats = applyPlanetUpgrade(stats, card);
  return stats;
}

const ARCHETYPES: ReadonlyArray<() => SeededBuild> = [
  () => ({
    jokers: [createTheDuoJoker(), createJollyJoker(), createSlyJoker()],
    handStats: leveled("mercury", 8),
  }),
  () => ({
    jokers: [createTheTrioJoker(), createZanyJoker(), createWilyJoker()],
    handStats: leveled("venus", 8),
  }),
];

export const EXPLORING_START_ARCHETYPES = ARCHETYPES.length;

export function exploringStart(index: number): SeededBuild {
  const make = ARCHETYPES[((index % ARCHETYPES.length) + ARCHETYPES.length) % ARCHETYPES.length];
  return make();
}
