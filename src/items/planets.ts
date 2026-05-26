import type { HandLabel } from "../scoring/handEvaluator";
import type { HandStats, HandStatsEntry } from "../scoring/handStats";

export const PLANET_BASE_PRICE = 3;

export interface PlanetCard {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly hands: ReadonlyArray<HandLabel>;
  readonly chipsDelta: number;
  readonly multDelta: number;
  readonly hiddenUntilPlayed?: HandLabel;
}

type PlanetSpec = Omit<PlanetCard, "description">;

const PLANET_SPECS: ReadonlyArray<PlanetSpec> = [
  { id: "pluto", name: "Pluto", hands: ["High Card"], chipsDelta: 10, multDelta: 1 },
  { id: "mercury", name: "Mercury", hands: ["Pair"], chipsDelta: 15, multDelta: 1 },
  { id: "uranus", name: "Uranus", hands: ["Two Pair"], chipsDelta: 20, multDelta: 1 },
  { id: "venus", name: "Venus", hands: ["Three of a Kind"], chipsDelta: 20, multDelta: 2 },
  { id: "saturn", name: "Saturn", hands: ["Straight"], chipsDelta: 30, multDelta: 3 },
  { id: "jupiter", name: "Jupiter", hands: ["Flush"], chipsDelta: 15, multDelta: 2 },
  { id: "earth", name: "Earth", hands: ["Full House"], chipsDelta: 25, multDelta: 2 },
  { id: "mars", name: "Mars", hands: ["Four of a Kind"], chipsDelta: 30, multDelta: 3 },
  { id: "neptune", name: "Neptune", hands: ["Straight Flush", "Royal Flush"], chipsDelta: 40, multDelta: 4 },
  {
    id: "planet-x",
    name: "Planet X",
    hands: ["Five of a Kind"],
    chipsDelta: 35,
    multDelta: 3,
    hiddenUntilPlayed: "Five of a Kind",
  },
  {
    id: "ceres",
    name: "Ceres",
    hands: ["Flush House"],
    chipsDelta: 40,
    multDelta: 4,
    hiddenUntilPlayed: "Flush House",
  },
  {
    id: "eris",
    name: "Eris",
    hands: ["Flush Five"],
    chipsDelta: 50,
    multDelta: 3,
    hiddenUntilPlayed: "Flush Five",
  },
];

function buildPlanet(spec: PlanetSpec): PlanetCard {
  const handsLabel = spec.hands.join(" / ");
  return {
    ...spec,
    description: `Upgrades ${handsLabel}: +${spec.multDelta} Mult, +${spec.chipsDelta} Chips`,
  };
}

export function createPlanetCatalog(): PlanetCard[] {
  return PLANET_SPECS.map(buildPlanet);
}

export function availablePlanets(
  catalog: ReadonlyArray<PlanetCard>,
  handPlayCounts: Readonly<Record<HandLabel, number>>,
): PlanetCard[] {
  return catalog.filter((planet) => {
    if (planet.hiddenUntilPlayed === undefined) return true;
    return (handPlayCounts[planet.hiddenUntilPlayed] ?? 0) >= 1;
  });
}

export function applyPlanetUpgrade(
  stats: HandStats,
  card: PlanetCard,
): HandStats {
  const next: Record<HandLabel, HandStatsEntry> = { ...stats };
  for (const label of card.hands) {
    const prev = next[label];
    next[label] = {
      chips: prev.chips + card.chipsDelta,
      multiplier: prev.multiplier + card.multDelta,
      level: prev.level + 1,
    };
  }
  return next;
}
