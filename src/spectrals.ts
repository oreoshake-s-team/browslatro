export const SPECTRAL_BASE_PRICE = 4;

export type SpectralEffect =
  | { readonly kind: "add-money"; readonly amount: number }
  | { readonly kind: "add-hands"; readonly amount: number }
  | { readonly kind: "add-discards"; readonly amount: number };

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
    case "add-money":
      return `+$${effect.amount}`;
    case "add-hands":
      return `+${effect.amount} hand${effect.amount === 1 ? "" : "s"} this round`;
    case "add-discards":
      return `+${effect.amount} discard${effect.amount === 1 ? "" : "s"} this round`;
  }
}

const SPECTRAL_SPECS: ReadonlyArray<SpectralSpec> = [
  { id: "spectre", name: "Spectre", effect: { kind: "add-money", amount: 10 } },
  { id: "wraith", name: "Wraith", effect: { kind: "add-hands", amount: 1 } },
  { id: "phantom", name: "Phantom", effect: { kind: "add-discards", amount: 2 } },
];

export function createSpectralCatalog(): SpectralCard[] {
  return SPECTRAL_SPECS.map((spec) => ({ ...spec, description: describe(spec) }));
}
