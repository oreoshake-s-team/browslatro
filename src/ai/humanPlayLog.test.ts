// @vitest-environment node
import { describe, expect, test } from "vitest";
import type { DatasetRecord } from "./dataset";
import {
  createHumanPlayLog,
  HUMAN_PLAY_LOG_KEY,
  MAX_LOG_RECORDS,
  type LogStorage,
} from "./humanPlayLog";
import { buildRunEventRecord } from "./runEvents";
import { useGame } from "../store/game";

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

describe("run event records", () => {
  function purchaseRecord() {
    return buildRunEventRecord(useGame.getState(), 7, {
      kind: "purchase",
      item: { itemType: "joker", id: "blueprint", name: "Blueprint", cost: 10 },
      offers: [
        { itemType: "joker", id: "blueprint", name: "Blueprint", cost: 10 },
      ],
    });
  }

  test("appends a run event alongside hand decisions", () => {
    const log = createHumanPlayLog(memoryStorage());
    expect(log.append(purchaseRecord())).toBe(true);
  });

  test("counts records per kind", () => {
    const log = createHumanPlayLog(memoryStorage());
    log.append(record(1));
    log.append(purchaseRecord());
    log.append(purchaseRecord());
    expect(log.counts()).toEqual({ hand: 1, purchase: 2 });
  });

  test("rotation keeps the log at the cap", () => {
    const log = createHumanPlayLog(memoryStorage());
    for (let index = 0; index <= MAX_LOG_RECORDS; index += 1) {
      log.append(purchaseRecord());
    }
    expect(log.count()).toBe(MAX_LOG_RECORDS);
  });

  test("rotation drops the oldest record first", () => {
    const log = createHumanPlayLog(memoryStorage());
    log.append(record(1));
    for (let index = 0; index < MAX_LOG_RECORDS; index += 1) {
      log.append(purchaseRecord());
    }
    expect(log.counts()).toEqual({ purchase: MAX_LOG_RECORDS });
  });

  test("the envelope carries the live store state", () => {
    const record = buildRunEventRecord(useGame.getState(), 42, {
      kind: "blind-skip",
      tag: null,
    });
    expect([record.runSeed, record.ante, record.money]).toEqual([
      42,
      useGame.getState().ante,
      useGame.getState().money,
    ]);
  });
});
