import type { PackOption } from "../items/packs";
import type { ShopItem } from "../items/shop";
import type { GameState } from "../store/game";
import type { ConsumableUseDecision } from "./consumableUseDecision";
import type { HandOption } from "./getHandOptions";
import type { ModelState } from "./modelState";
import type {
  PackAdviceCandidate,
  PackAdviceState,
  ShopAdviceCandidate,
  ShopAdviceState,
  ShopRolloutState,
} from "./advisor/types";

export const RUN_EVENT_SCHEMA_VERSION = 4;

export type RunEventKind =
  | "purchase"
  | "reroll"
  | "pack-pick"
  | "consumable-use"
  | "joker-sell"
  | "blind-skip"
  | "advice-feedback";

export interface RunEventEnvelope {
  readonly schemaVersion: typeof RUN_EVENT_SCHEMA_VERSION;
  readonly kind: RunEventKind;
  readonly runSeed: number;
  readonly ante: number;
  readonly round: number;
  readonly blind: number;
  readonly money: number;
}

export interface ShopItemSnapshot {
  readonly itemType: string;
  readonly id: string;
  readonly name: string;
  readonly cost: number;
}

export interface PurchaseEvent {
  readonly kind: "purchase";
  readonly item: ShopItemSnapshot;
  readonly offers: ReadonlyArray<ShopItemSnapshot>;
}

export interface RerollEvent {
  readonly kind: "reroll";
  readonly cost: number;
  readonly offers: ReadonlyArray<ShopItemSnapshot>;
}

export interface PackOptionSnapshot {
  readonly optionType: string;
  readonly id: string;
  readonly name: string;
}

export interface PackPickEvent {
  readonly kind: "pack-pick";
  readonly pool: string;
  readonly variant: string;
  readonly options: ReadonlyArray<PackOptionSnapshot>;
  readonly pickedIndex: number | null;
  readonly picksRemaining: number;
}

export interface ConsumableUseEvent {
  readonly kind: "consumable-use";
  readonly consumable: {
    readonly id: string;
    readonly name: string;
    readonly consumableKind: string;
  };
  readonly targetCardIds: ReadonlyArray<number>;
  readonly state: ModelState;
  readonly item: ConsumableUseDecision["item"];
  readonly offers: ConsumableUseDecision["offers"];
  readonly candidates: ConsumableUseDecision["candidates"];
  readonly chosenIndex: number;
  readonly consumablesHeld: number;
}

export interface JokerSellEvent {
  readonly kind: "joker-sell";
  readonly joker: {
    readonly id: string;
    readonly name: string;
    readonly sellValue: number;
  };
  readonly heldJokerIds: ReadonlyArray<string>;
}

export interface BlindSkipEvent {
  readonly kind: "blind-skip";
  readonly tag: { readonly id: string; readonly name: string } | null;
}

export type AdvisorKind = "llm" | "policy";
export type AdviceVerdict = "bad" | "good";
export type AdviceFeedbackSource =
  | "explicit"
  | "auto-disagreement"
  | "auto-agreement";

export interface HandAdviceDecision {
  readonly context: "hand";
  readonly state: ModelState;
  readonly candidates: ReadonlyArray<HandOption>;
}

export interface ShopAdviceDecision {
  readonly context: "shop";
  readonly state: ShopAdviceState;
  readonly candidates: ReadonlyArray<ShopAdviceCandidate>;
  readonly rollout?: ShopRolloutState;
}

export interface PackAdviceDecision {
  readonly context: "pack";
  readonly state: PackAdviceState;
  readonly candidates: ReadonlyArray<PackAdviceCandidate>;
}

export type AdviceDecision =
  | HandAdviceDecision
  | ShopAdviceDecision
  | PackAdviceDecision;

export interface AdviceFeedbackEvent {
  readonly kind: "advice-feedback";
  readonly advisorKind: AdvisorKind;
  readonly model: string;
  readonly recommendationIndex: number;
  readonly alternativeIndex: number | null;
  readonly verdict: AdviceVerdict;
  readonly correctedIndex: number | null;
  readonly source: AdviceFeedbackSource;
  readonly decision: AdviceDecision;
}

export type RunEvent =
  | PurchaseEvent
  | RerollEvent
  | PackPickEvent
  | ConsumableUseEvent
  | JokerSellEvent
  | BlindSkipEvent
  | AdviceFeedbackEvent;

export type RunEventRecord = RunEventEnvelope & RunEvent;

export function buildRunEventRecord(
  state: GameState,
  runSeed: number,
  event: RunEvent,
): RunEventRecord {
  return {
    schemaVersion: RUN_EVENT_SCHEMA_VERSION,
    runSeed,
    ante: state.ante,
    round: state.round,
    blind: state.blind,
    money: state.money,
    ...event,
  };
}

export function shopItemSnapshot(
  item: ShopItem,
  cost: number,
): ShopItemSnapshot {
  switch (item.kind) {
    case "joker":
      return { itemType: "joker", id: item.joker.id, name: item.joker.name, cost };
    case "planet":
      return {
        itemType: "planet",
        id: item.planet.id,
        name: item.planet.name,
        cost,
      };
    case "tarot":
      return { itemType: "tarot", id: item.tarot.id, name: item.tarot.name, cost };
    case "spectral":
      return {
        itemType: "spectral",
        id: item.spectral.id,
        name: item.spectral.name,
        cost,
      };
    case "playing-card":
      return {
        itemType: "playing-card",
        id: String(item.card.id),
        name: `${item.card.rank} of ${item.card.suit}`,
        cost,
      };
    case "pack":
      return {
        itemType: "pack",
        id: `${item.pack.pool}-${item.pack.variant}`,
        name: `${item.pack.variant} ${item.pack.pool} pack`,
        cost,
      };
  }
}

export function packOptionSnapshot(option: PackOption): PackOptionSnapshot {
  switch (option.kind) {
    case "planet":
      return { optionType: "planet", id: option.planet.id, name: option.planet.name };
    case "tarot":
      return { optionType: "tarot", id: option.tarot.id, name: option.tarot.name };
    case "joker":
      return { optionType: "joker", id: option.joker.id, name: option.joker.name };
    case "spectral":
      return {
        optionType: "spectral",
        id: option.spectral.id,
        name: option.spectral.name,
      };
    case "playing-card":
      return {
        optionType: "playing-card",
        id: String(option.card.id),
        name: `${option.card.rank} of ${option.card.suit}`,
      };
  }
}

