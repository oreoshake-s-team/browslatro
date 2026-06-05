import {
  EDITION_BASE_RATES,
  FOIL_CHIPS,
  HOLOGRAPHIC_MULT,
  POLYCHROME_X_MULT,
} from "./constants";
import type {
  Joker,
  JokerEdition,
  JokerEditionInfo,
  RandomSource,
} from "./types";

export const JOKER_EDITION_INFO: Readonly<Record<JokerEdition, JokerEditionInfo>> = {
  foil: { name: "Foil", description: `+${FOIL_CHIPS} chips when scored` },
  holographic: {
    name: "Holographic",
    description: `+${HOLOGRAPHIC_MULT} Mult when scored`,
  },
  polychrome: {
    name: "Polychrome",
    description: `×${POLYCHROME_X_MULT} Mult when scored`,
  },
  negative: { name: "Negative", description: "+1 Joker slot" },
};

export function withEdition(joker: Joker, edition: JokerEdition): Joker {
  return { ...joker, edition };
}

export function applyEditionToRandomJoker(
  jokers: ReadonlyArray<Joker>,
  edition: JokerEdition,
  rng: RandomSource = Math.random,
): Joker[] {
  if (jokers.length === 0) return [...jokers];
  const idx = Math.floor(rng() * jokers.length);
  return jokers.map((joker, i) => (i === idx ? withEdition(joker, edition) : joker));
}

export function withoutEdition(joker: Joker): Joker {
  const { edition: _edition, ...rest } = joker;
  return rest;
}

export function cloneJoker(joker: Joker): Joker {
  return { ...joker };
}

export function rollEdition(
  rng: RandomSource = Math.random,
  rateMultiplier: number = 1,
): JokerEdition | undefined {
  const multiplier = Math.max(0, rateMultiplier);
  const poly = Math.min(1, EDITION_BASE_RATES.polychrome * multiplier);
  const holo = Math.min(1, EDITION_BASE_RATES.holographic * multiplier);
  const foil = Math.min(1, EDITION_BASE_RATES.foil * multiplier);
  const r = rng();
  if (r < poly) return "polychrome";
  if (r < poly + holo) return "holographic";
  if (r < poly + holo + foil) return "foil";
  return undefined;
}
