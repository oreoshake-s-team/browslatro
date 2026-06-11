import type { GameState } from "../store/game";
import type { ModelState } from "./modelState";

export const RUN_EVENT_SCHEMA_VERSION = 2;

export type RunEventKind =
  | "purchase"
  | "consumable-use"
  | "joker-sell"
  | "blind-skip";

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

export interface ConsumableUseEvent {
  readonly kind: "consumable-use";
  readonly consumable: {
    readonly id: string;
    readonly name: string;
    readonly consumableKind: string;
  };
  readonly targetCardIds: ReadonlyArray<number>;
  readonly state: ModelState;
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

export type RunEvent =
  | PurchaseEvent
  | ConsumableUseEvent
  | JokerSellEvent
  | BlindSkipEvent;

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
