// @vitest-environment node
import {
  initialRunStats,
  recordBlindSkipped,
  recordHandPlayed,
  recordUnusedDiscards,
} from "./runStats";

describe("initialRunStats", () => {
  test("starts every counter at zero", () => {
    expect(initialRunStats()).toEqual({
      handsPlayed: 0,
      unusedDiscards: 0,
      blindsSkipped: 0,
    });
  });
});

describe("recordHandPlayed", () => {
  test("increments handsPlayed by one", () => {
    expect(recordHandPlayed(initialRunStats()).handsPlayed).toBe(1);
  });

  test("does not mutate the input stats", () => {
    const before = initialRunStats();
    recordHandPlayed(before);
    expect(before.handsPlayed).toBe(0);
  });

  test("leaves the other counters untouched (negative)", () => {
    const next = recordHandPlayed(initialRunStats());
    expect(next.unusedDiscards + next.blindsSkipped).toBe(0);
  });
});

describe("recordBlindSkipped", () => {
  test("increments blindsSkipped by one", () => {
    expect(recordBlindSkipped(initialRunStats()).blindsSkipped).toBe(1);
  });

  test("accumulates across repeated skips", () => {
    expect(recordBlindSkipped(recordBlindSkipped(initialRunStats())).blindsSkipped).toBe(2);
  });
});

describe("recordUnusedDiscards", () => {
  test("adds the remaining discards to the running total", () => {
    expect(recordUnusedDiscards(initialRunStats(), 2).unusedDiscards).toBe(2);
  });

  test("accumulates across multiple wins", () => {
    const after = recordUnusedDiscards(recordUnusedDiscards(initialRunStats(), 3), 1);
    expect(after.unusedDiscards).toBe(4);
  });

  test("adds nothing when no discards remained", () => {
    expect(recordUnusedDiscards(initialRunStats(), 0).unusedDiscards).toBe(0);
  });

  test("clamps a negative remaining count to zero (negative)", () => {
    expect(recordUnusedDiscards(initialRunStats(), -5).unusedDiscards).toBe(0);
  });
});
