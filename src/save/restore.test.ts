import "../test/memoryLocalStorage";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { useGame } from "../store/game";
import { nextCardId, resetCardIds } from "../cards/deck";
import { serializeRun } from "./runSnapshot";
import { STORAGE_KEY, clearSnapshot, saveSnapshot } from "./storage";
import { restoreSnapshotIfPresent, subscribeAndAutoSave } from "./restore";

describe("restoreSnapshotIfPresent", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useGame.getState().resetGame();
  });

  test("returns false when no snapshot is stored", () => {
    expect(restoreSnapshotIfPresent()).toBe(false);
  });

  test("returns true when a valid snapshot is stored", () => {
    const snapshot = serializeRun(useGame.getState());
    saveSnapshot(snapshot);
    expect(restoreSnapshotIfPresent()).toBe(true);
  });

  test("restores the money field from a saved snapshot", () => {
    useGame.getState().setMoney(42);
    saveSnapshot(serializeRun(useGame.getState()));
    useGame.getState().resetGame();
    restoreSnapshotIfPresent();
    expect(useGame.getState().money).toBe(42);
  });

  test("restores Set-valued state without losing its instance type", () => {
    useGame.getState().setSelectedIds(new Set([3, 4, 5]));
    saveSnapshot(serializeRun(useGame.getState()));
    useGame.getState().resetGame();
    restoreSnapshotIfPresent();
    expect(useGame.getState().selectedIds).toBeInstanceOf(Set);
  });

  test("restores Set-valued state with the original values", () => {
    useGame.getState().setSelectedIds(new Set([3, 4, 5]));
    saveSnapshot(serializeRun(useGame.getState()));
    useGame.getState().resetGame();
    restoreSnapshotIfPresent();
    expect([...useGame.getState().selectedIds]).toEqual([3, 4, 5]);
  });

  test("clears the stored snapshot when its schemaVersion is unsupported", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 99,
        exportedAt: new Date().toISOString(),
        state: { foo: "bar" },
      }),
    );
    restoreSnapshotIfPresent();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  test("advances cardIdCounter past the highest restored card id", () => {
    useGame.getState().setBaseDeckCards([
      { id: 17, rank: "A", suit: "spades" },
    ]);
    saveSnapshot(serializeRun(useGame.getState()));
    useGame.getState().resetGame();
    resetCardIds();
    restoreSnapshotIfPresent();
    expect(nextCardId()).toBeGreaterThan(17);
  });
});

describe("subscribeAndAutoSave", () => {
  let unsubscribe: () => void;

  beforeEach(() => {
    window.localStorage.clear();
    useGame.getState().resetGame();
    unsubscribe = subscribeAndAutoSave();
  });

  afterEach(() => {
    unsubscribe();
    clearSnapshot();
  });

  test("writes a snapshot to storage after a store change is flushed", async () => {
    useGame.getState().setMoney(123);
    await Promise.resolve();
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('"money":123');
  });

  test("returns an unsubscribe function that stops further saves", async () => {
    useGame.getState().setMoney(1);
    await Promise.resolve();
    unsubscribe();
    window.localStorage.clear();
    useGame.getState().setMoney(2);
    await Promise.resolve();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
