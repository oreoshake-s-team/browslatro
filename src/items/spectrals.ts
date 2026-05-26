export const SPECTRAL_BASE_PRICE = 4;

export const IMMOLATE_DESTROY_COUNT = 5;
export const IMMOLATE_MONEY_GAIN = 20;

export type SpectralEffect =
  | { readonly kind: "black-hole" }
  | { readonly kind: "immolate"; readonly destroyCount: number; readonly moneyGain: number }
  | { readonly kind: "sigil" };

export interface SpectralCard {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly effect: SpectralEffect;
}

type SpectralSpec = Omit<SpectralCard, "description">;

function describe(spec: SpectralSpec): string {
  const effect = spec.effect;
  switch (effect.kind) {
    case "black-hole":
      return "Upgrade every poker hand by 1 level";
    case "immolate":
      return `Destroys ${effect.destroyCount} random cards in hand, gain $${effect.moneyGain}`;
    case "sigil":
      return "Converts all cards in hand to a single random suit";
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
];

export function createSpectralCatalog(): SpectralCard[] {
  return SPECTRAL_SPECS.map((spec) => ({ ...spec, description: describe(spec) }));
}
