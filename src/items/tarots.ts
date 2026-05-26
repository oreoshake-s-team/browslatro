import type { Enhancement } from "../cards/types";

export const TAROT_BASE_PRICE = 3;
export const HERMIT_MONEY_CAP = 20;

export type TarotEffect =
  | {
      readonly kind: "apply-enhancement";
      readonly enhancement: Enhancement;
      readonly maxTargets: 1 | 2;
    }
  | {
      readonly kind: "money-multiply";
      readonly multiplier: number;
      readonly bonusCap: number;
    };

export interface TarotCard {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly effect: TarotEffect;
}

type TarotSpec = Omit<TarotCard, "description">;

function describe(spec: TarotSpec): string {
  const effect = spec.effect;
  if (effect.kind === "money-multiply") {
    return `Doubles current money (max +$${effect.bonusCap})`;
  }
  const targets = effect.maxTargets === 1 ? "1 card" : `up to ${effect.maxTargets} cards`;
  return `Apply ${effect.enhancement} enhancement to ${targets} in hand`;
}

const TAROT_SPECS: ReadonlyArray<TarotSpec> = [
  { id: "the-magician", name: "The Magician", effect: { kind: "apply-enhancement", enhancement: "lucky", maxTargets: 2 } },
  { id: "the-empress", name: "The Empress", effect: { kind: "apply-enhancement", enhancement: "mult", maxTargets: 2 } },
  { id: "the-hierophant", name: "The Hierophant", effect: { kind: "apply-enhancement", enhancement: "bonus", maxTargets: 2 } },
  { id: "the-lovers", name: "The Lovers", effect: { kind: "apply-enhancement", enhancement: "wild", maxTargets: 1 } },
  { id: "the-chariot", name: "The Chariot", effect: { kind: "apply-enhancement", enhancement: "steel", maxTargets: 1 } },
  { id: "justice", name: "Justice", effect: { kind: "apply-enhancement", enhancement: "glass", maxTargets: 1 } },
  { id: "the-devil", name: "The Devil", effect: { kind: "apply-enhancement", enhancement: "gold", maxTargets: 1 } },
  { id: "the-tower", name: "The Tower", effect: { kind: "apply-enhancement", enhancement: "stone", maxTargets: 1 } },
  { id: "the-hermit", name: "The Hermit", effect: { kind: "money-multiply", multiplier: 2, bonusCap: HERMIT_MONEY_CAP } },
];

export function createTarotCatalog(): TarotCard[] {
  return TAROT_SPECS.map((spec) => ({ ...spec, description: describe(spec) }));
}

export function resolveHermitPayout(currentMoney: number, cap: number = HERMIT_MONEY_CAP): number {
  if (currentMoney <= 0) return 0;
  return Math.min(currentMoney, cap);
}
