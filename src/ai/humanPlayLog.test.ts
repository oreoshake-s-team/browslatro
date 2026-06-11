// @vitest-environment node
import { describe, expect, test } from "vitest";
import type { DatasetRecord } from "./dataset";
import {
  createHumanPlayLog,
  HUMAN_PLAY_LOG_KEY,
  type LogStorage,
} from "./humanPlayLog";

function memoryStorage(): LogStorage & { readonly data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

function record(seed: number): DatasetRecord {
  return {
    schemaVersion: 1,
    runSeed: seed,
    ante: 1,
    blind: 1,
    state: {} as DatasetRecord["state"],
    candidates: [],
    chosenIndex: 0,
    chosenAction: { kind: "play", cardIds: [1] },
  };
}

describe("createHumanPlayLog", () => {
  test("starts empty", () => {
    expect(createHumanPlayLog(memoryStorage()).count()).toBe(0);
  });

  test("counts appended records", () => {
    const log = createHumanPlayLog(memoryStorage());
    log.append(record(1));
    log.append(record(2));
    expect(log.count()).toBe(2);
  });

  test("exports one parseable JSON line per record", () => {
    const log = createHumanPlayLog(memoryStorage());
    log.append(record(1));
    log.append(record(2));
    const seeds = log
      .toJsonl()
      .split("\n")
      .map((line) => (JSON.parse(line) as DatasetRecord).runSeed);
    expect(seeds).toEqual([1, 2]);
  });

  test("exports an empty string when empty", () => {
    expect(createHumanPlayLog(memoryStorage()).toJsonl()).toBe("");
  });

  test("clear removes the stored log", () => {
    const storage = memoryStorage();
    const log = createHumanPlayLog(storage);
    log.append(record(1));
    log.clear();
    expect(storage.data.has(HUMAN_PLAY_LOG_KEY)).toBe(false);
  });

  test("append reports failure when storage rejects the write", () => {
    const storage = memoryStorage();
    const failing: LogStorage = {
      ...storage,
      setItem: () => {
        throw new Error("quota exceeded");
      },
    };
    expect(createHumanPlayLog(failing).append(record(1))).toBe(false);
  });

  test("a failed append leaves the log unchanged", () => {
    const storage = memoryStorage();
    const log = createHumanPlayLog(storage);
    log.append(record(1));
    const failing = createHumanPlayLog({
      ...storage,
      setItem: () => {
        throw new Error("quota exceeded");
      },
    });
    failing.append(record(2));
    expect(createHumanPlayLog(storage).count()).toBe(1);
  });
});
