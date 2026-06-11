import type { Consumable } from "../../items/consumables";
import type { Joker } from "../../items/jokers";
import type { PackOffer, PackOption } from "../../items/packs";
import { spectralNeedsTarget } from "../../items/spectrals";
import {
  consumableRefs,
  jokerRefs,
  packAdviceOption,
} from "./contextSnapshots";
import {
  MAX_CANDIDATES,
  MIN_CONTEXT_CANDIDATES,
  type PackAdviceCandidate,
  type PackAdviceRequest,
} from "./types";

export type PackSuggestionAction =
  | { readonly kind: "pick"; readonly optionIdx: number }
  | { readonly kind: "skip" };

export interface PackAdvicePlan {
  readonly request: PackAdviceRequest;
  readonly actions: ReadonlyArray<PackSuggestionAction>;
}

export interface PackAdviceInput {
  readonly pack: PackOffer;
  readonly picksRemaining: number;
  readonly pickedIndices: ReadonlySet<number>;
  readonly jokerSlotsFull: boolean;
  readonly consumableSlotsFull: boolean;
  readonly money: number;
  readonly ante: number;
  readonly jokers: ReadonlyArray<Joker>;
  readonly consumables: ReadonlyArray<Consumable>;
  readonly jokerCapacity: number;
  readonly consumableCapacity: number;
}

function isPickable(option: PackOption, input: PackAdviceInput): boolean {
  if (option.kind === "joker") return !input.jokerSlotsFull;
  if (option.kind === "spectral") {
    const effect = option.spectral.effect;
    const needsConsumableSlot =
      spectralNeedsTarget(effect) && effect.kind !== "duplicate-selected";
    return !(needsConsumableSlot && input.consumableSlotsFull);
  }
  return true;
}

interface PlanEntry {
  readonly candidate: PackAdviceCandidate;
  readonly action: PackSuggestionAction;
}

export function buildPackAdvicePlan(input: PackAdviceInput): PackAdvicePlan | null {
  if (input.picksRemaining <= 0) return null;
  const picks: PlanEntry[] = [];
  input.pack.options.forEach((option, optionIdx) => {
    if (input.pickedIndices.has(optionIdx)) return;
    if (!isPickable(option, input)) return;
    picks.push({
      candidate: { action: "pick", option: packAdviceOption(option) },
      action: { kind: "pick", optionIdx },
    });
  });
  const entries = [
    ...picks.slice(0, MAX_CANDIDATES - 1),
    { candidate: { action: "skip" } as const, action: { kind: "skip" } as const },
  ];
  if (entries.length < MIN_CONTEXT_CANDIDATES) return null;
  return {
    request: {
      context: "pack",
      pack: {
        pool: input.pack.pool,
        variant: input.pack.variant,
        picksRemaining: input.picksRemaining,
        money: input.money,
        ante: input.ante,
        jokers: jokerRefs(input.jokers),
        jokerCapacity: input.jokerCapacity,
        consumables: consumableRefs(input.consumables),
        consumableCapacity: input.consumableCapacity,
      },
      candidates: entries.map((entry) => entry.candidate),
    },
    actions: entries.map((entry) => entry.action),
  };
}
