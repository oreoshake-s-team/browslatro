// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  MODEL_PROGRESS_CEILING,
  MODEL_PROGRESS_EASE_MS,
  easedModelProgress,
  realModelFraction,
} from "./modelLoadProgress";

describe("realModelFraction", () => {
  test("returns the loaded/total ratio when total is known", () => {
    expect(realModelFraction({ loaded: 64, total: 128 })).toBe(0.5);
  });

  test("returns 0 when total is null", () => {
    expect(realModelFraction({ loaded: 999, total: null })).toBe(0);
  });

  test("returns 0 when total is zero (negative)", () => {
    expect(realModelFraction({ loaded: 10, total: 0 })).toBe(0);
  });

  test("clamps to 1 when loaded exceeds total (negative)", () => {
    expect(realModelFraction({ loaded: 200, total: 128 })).toBe(1);
  });

  test("returns 0 when there is no progress at all", () => {
    expect(realModelFraction(null)).toBe(0);
  });
});

describe("easedModelProgress", () => {
  test("starts at 0 for an indeterminate load", () => {
    expect(easedModelProgress(0, { loaded: 0, total: null })).toBe(0);
  });

  test("climbs as elapsed time grows", () => {
    const early = easedModelProgress(100, { loaded: 0, total: null });
    const later = easedModelProgress(400, { loaded: 0, total: null });
    expect(later).toBeGreaterThan(early);
  });

  test("decelerates as it fills", () => {
    const earlyDelta =
      easedModelProgress(200, null) - easedModelProgress(0, null);
    const lateDelta =
      easedModelProgress(MODEL_PROGRESS_EASE_MS, null) -
      easedModelProgress(MODEL_PROGRESS_EASE_MS - 200, null);
    expect(earlyDelta).toBeGreaterThan(lateDelta);
  });

  test("never exceeds the ceiling on its own", () => {
    expect(easedModelProgress(10_000, { loaded: 0, total: null })).toBe(
      MODEL_PROGRESS_CEILING,
    );
  });

  test("reflects real download progress immediately at mount", () => {
    expect(easedModelProgress(0, { loaded: 64, total: 128 })).toBeCloseTo(0.45);
  });

  test("real progress wins over the fake tick when it is further along", () => {
    expect(easedModelProgress(1, { loaded: 100, total: 100 })).toBe(
      MODEL_PROGRESS_CEILING,
    );
  });

  test("never moves backwards across the load duration", () => {
    const progress = { loaded: 0, total: null };
    let prev = -1;
    for (let ms = 0; ms <= MODEL_PROGRESS_EASE_MS; ms += 100) {
      const next = easedModelProgress(ms, progress);
      expect(next).toBeGreaterThanOrEqual(prev);
      prev = next;
    }
  });
});
