import { describe, expect, test } from "vitest";
import {
  SCHEMA_VERSION,
  deserializeRun,
  isSerializedRun,
  serializeRun,
} from "./runSnapshot";

describe("serializeRun", () => {
  test("returns an object stamped with schemaVersion 1", () => {
    expect(serializeRun({ money: 4 }).schemaVersion).toBe(SCHEMA_VERSION);
  });

  test("returns an ISO-8601 exportedAt string", () => {
    const snapshot = serializeRun({ money: 4 });
    expect(snapshot.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test("strips function values from the snapshot", () => {
    const snapshot = serializeRun({ money: 4, spend: () => false });
    expect(snapshot.state).toEqual({ money: 4 });
  });

  test("encodes Set values with a __type sentinel", () => {
    const snapshot = serializeRun({ ids: new Set([1, 2, 3]) });
    expect(snapshot.state.ids).toEqual({ __type: "Set", values: [1, 2, 3] });
  });

  test("encodes Map values with a __type sentinel", () => {
    const snapshot = serializeRun({ map: new Map([[1, "a"], [2, "b"]]) });
    expect(snapshot.state.map).toEqual({
      __type: "Map",
      entries: [[1, "a"], [2, "b"]],
    });
  });

  test("produces a result that JSON.stringify can serialize", () => {
    const snapshot = serializeRun({
      money: 4,
      ids: new Set([1]),
      map: new Map([["k", 1]]),
    });
    expect(() => JSON.stringify(snapshot)).not.toThrow();
  });

  test("throws when the encoded top-level value is not an object", () => {
    expect(() => serializeRun(["just", "an", "array"] as unknown as object)).toThrow(
      /must serialize to an object/,
    );
  });
});

describe("deserializeRun", () => {
  test("round-trips primitives", () => {
    const snapshot = serializeRun({ money: 4, ante: 1, name: "x" });
    expect(deserializeRun(snapshot)).toEqual({ money: 4, ante: 1, name: "x" });
  });

  test("round-trips Set instances back to Set", () => {
    const snapshot = serializeRun({ ids: new Set([1, 2, 3]) });
    const decoded = deserializeRun(snapshot);
    expect(decoded.ids).toBeInstanceOf(Set);
  });

  test("round-trips Map instances back to Map", () => {
    const snapshot = serializeRun({ map: new Map([[1, "a"]]) });
    const decoded = deserializeRun(snapshot);
    expect(decoded.map).toBeInstanceOf(Map);
  });

  test("preserves nested Set values after round-trip", () => {
    const snapshot = serializeRun({ inner: { ids: new Set([7, 8]) } });
    const decoded = deserializeRun(snapshot) as { inner: { ids: Set<number> } };
    expect([...decoded.inner.ids]).toEqual([7, 8]);
  });

  test("round-trips a joker's state.value counter intact (#804 — Spare Trousers state)", () => {
    const jokers = [
      {
        id: "spare-trousers",
        name: "Spare Trousers",
        description: "...",
        rarity: "uncommon" as const,
        effect: { kind: "on-hand-type-stack-mult" as const, requires: "Two Pair" as const, amount: 2 },
        state: { kind: "counter" as const, value: 8 },
      },
    ];
    const decoded = deserializeRun(serializeRun({ jokers })) as {
      jokers: ReadonlyArray<{ state: { kind: string; value: number } }>;
    };
    expect(decoded.jokers[0].state).toEqual({ kind: "counter", value: 8 });
  });

  test("round-trips a Wee Joker's chips-counter state intact (#825 — on-played-rank-stack-chips)", () => {
    const jokers = [
      {
        id: "wee-joker",
        name: "Wee Joker",
        description: "...",
        rarity: "rare" as const,
        effect: { kind: "on-played-rank-stack-chips" as const, ranks: ["2"] as const, amount: 8 },
        state: { kind: "counter" as const, value: 24 },
      },
    ];
    const decoded = deserializeRun(serializeRun({ jokers })) as {
      jokers: ReadonlyArray<{ state: { kind: string; value: number } }>;
    };
    expect(decoded.jokers[0].state).toEqual({ kind: "counter", value: 24 });
  });

  test("rejects snapshots with an unsupported schemaVersion", () => {
    expect(() =>
      deserializeRun({
        schemaVersion: 99 as 1,
        exportedAt: new Date().toISOString(),
        state: {},
      }),
    ).toThrow(/Unsupported snapshot schemaVersion/);
  });
});

describe("isSerializedRun", () => {
  test("accepts a freshly serialized snapshot", () => {
    expect(isSerializedRun(serializeRun({ money: 4 }))).toBe(true);
  });

  test("rejects null", () => {
    expect(isSerializedRun(null)).toBe(false);
  });

  test("rejects an object missing state", () => {
    expect(
      isSerializedRun({ schemaVersion: 1, exportedAt: "x" }),
    ).toBe(false);
  });

  test("rejects an object with the wrong schemaVersion", () => {
    expect(
      isSerializedRun({ schemaVersion: 2, exportedAt: "x", state: {} }),
    ).toBe(false);
  });
});
