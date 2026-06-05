import "../test/memoryLocalStorage";
import { beforeEach, describe, expect, test } from "vitest";
import { serializeRun } from "./runSnapshot";
import {
  STORAGE_KEY,
  clearSnapshot,
  loadSnapshot,
  saveSnapshot,
} from "./storage";

describe("snapshot storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("loadSnapshot returns null when no snapshot is stored", () => {
    expect(loadSnapshot()).toBeNull();
  });

  test("loadSnapshot returns null when the stored value is not valid JSON", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadSnapshot()).toBeNull();
  });

  test("loadSnapshot returns null when the stored value is not a SerializedRun", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: "bar" }));
    expect(loadSnapshot()).toBeNull();
  });

  test("saveSnapshot persists a snapshot under the canonical key", () => {
    const snapshot = serializeRun({ money: 4 });
    saveSnapshot(snapshot);
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain(
      '"schemaVersion":1',
    );
  });

  test("loadSnapshot returns the previously saved snapshot", () => {
    const snapshot = serializeRun({ money: 4 });
    saveSnapshot(snapshot);
    expect(loadSnapshot()).toEqual(snapshot);
  });

  test("clearSnapshot removes a previously saved snapshot", () => {
    saveSnapshot(serializeRun({ money: 4 }));
    clearSnapshot();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
