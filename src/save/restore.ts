import { useGame, type GameState } from "../store/game";
import { advanceCardIdsTo } from "../cards/deck";
import type { Card } from "../cards/types";
import { deserializeRun, serializeRun } from "./runSnapshot";
import {
  STORAGE_KEY,
  clearSnapshot,
  loadSnapshot,
  saveSnapshot,
} from "./storage";

function isCardLike(v: unknown): v is Card {
  return (
    typeof v === "object" &&
    v !== null &&
    "id" in v &&
    typeof (v).id === "number"
  );
}

function collectMaxCardId(value: unknown, current: number): number {
  if (isCardLike(value)) {
    return value.id > current ? value.id : current;
  }
  if (Array.isArray(value)) {
    let next = current;
    for (const item of value) next = collectMaxCardId(item, next);
    return next;
  }
  if (value instanceof Map) {
    let next = current;
    for (const [, v] of value) next = collectMaxCardId(v, next);
    return next;
  }
  if (value instanceof Set) {
    let next = current;
    for (const item of value) next = collectMaxCardId(item, next);
    return next;
  }
  if (typeof value === "object" && value !== null) {
    let next = current;
    for (const v of Object.values(value)) next = collectMaxCardId(v, next);
    return next;
  }
  return current;
}

let didRestore = false;

export function didRestoreFromSnapshot(): boolean {
  return didRestore;
}

export function _resetRestoreFlagForTests(): void {
  didRestore = false;
}

export function restoreSnapshotIfPresent(): boolean {
  const snapshot = loadSnapshot();
  if (!snapshot) {
    if (window.localStorage.getItem(STORAGE_KEY) !== null) clearSnapshot();
    return false;
  }
  let restored: Record<string, unknown>;
  try {
    restored = deserializeRun(snapshot);
  } catch {
    clearSnapshot();
    return false;
  }
  useGame.setState(restored as Partial<GameState>);
  advanceCardIdsTo(collectMaxCardId(useGame.getState(), 0));
  didRestore = true;
  return true;
}

let saveScheduled = false;

export function subscribeAndAutoSave(): () => void {
  return useGame.subscribe(() => {
    if (saveScheduled) return;
    saveScheduled = true;
    queueMicrotask(() => {
      saveScheduled = false;
      saveSnapshot(serializeRun(useGame.getState()));
    });
  });
}
