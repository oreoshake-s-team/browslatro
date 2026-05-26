import type { Seal } from "../cards/types";

export const SPECTRAL_BASE_PRICE = 4;

export const IMMOLATE_DESTROY_COUNT = 5;
export const IMMOLATE_MONEY_GAIN = 20;

export type SpectralEffect =
  | { readonly kind: "black-hole" }
  | { readonly kind: "immolate"; readonly destroyCount: number; readonly moneyGain: number }
  | { readonly kind: "sigil" }
  | { readonly kind: "apply-seal"; readonly seal: Seal; readonly maxTargets: 1 };

export interface SpectralCard {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly effect: SpectralEffect;
}

type SpectralSpec = Omit<SpectralCard, "description">;

const SEAL_DISPLAY: Record<Seal, string> = {
  gold: "Gold",
  red: "Red",
  blue: "Blue",
  purple: "Purple",
};

function describe(spec: SpectralSpec): string {
  const effect = spec.effect;
  switch (effect.kind) {
    case "black-hole":
      return "Upgrade every poker hand by 1 level";
    case "immolate":
      return `Destroys ${effect.destroyCount} random cards in hand, gain $${effect.moneyGain}`;
    case "sigil":
      return "Converts all cards in hand to a single random suit";
    case "apply-seal":
      return `Add a ${SEAL_DISPLAY[effect.seal]} Seal to 1 selected card in your hand`;
  }
}

const SPECTRAL_SPECS: ReadonlyArray<SpectralSpec> = [
  { id: "black-hole", name: "Black Hole", effect: { kind: "black-hole" } },
  {
    id: "immolate",
    name: "Immolate",
    effect: {
      kind: "immolate",
      destroyCount: IMMOLATE_DESTROY_COUNT,
      moneyGain: IMMOLATE_MONEY_GAIN,
    },
  },
  { id: "sigil", name: "Sigil", effect: { kind: "sigil" } },
  {
    id: "talisman",
    name: "Talisman",
    effect: { kind: "apply-seal", seal: "gold", maxTargets: 1 },
  },
  {
    id: "deja-vu",
    name: "Deja Vu",
    effect: { kind: "apply-seal", seal: "red", maxTargets: 1 },
  },
  {
    id: "trance",
    name: "Trance",
    effect: { kind: "apply-seal", seal: "blue", maxTargets: 1 },
  },
  {
    id: "medium",
    name: "Medium",
    effect: { kind: "apply-seal", seal: "purple", maxTargets: 1 },
  },
];

export function createSpectralCatalog(): SpectralCard[] {
  return SPECTRAL_SPECS.map((spec) => ({ ...spec, description: describe(spec) }));
}
