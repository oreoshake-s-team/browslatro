// @vitest-environment node
import { describe, expect, test } from "vitest";
import { EXPLORING_START_ARCHETYPES, exploringStart } from "./exploringStarts";

describe("exploringStart", () => {
  test("gives each archetype synergy jokers", () => {
    expect(exploringStart(0).jokers.length).toBeGreaterThan(0);
  });

  test("levels a hand above the default for the wincon", () => {
    const pairLevel = exploringStart(0).handStats.Pair.level;
    expect(pairLevel).toBeGreaterThan(1);
  });

  test("cycles through distinct archetypes", () => {
    const first = exploringStart(0).jokers.map((j) => j.id).join(",");
    const second = exploringStart(1).jokers.map((j) => j.id).join(",");
    expect(first).not.toBe(second);
  });

  test("wraps the index around the archetype count", () => {
    const a = exploringStart(0).jokers.map((j) => j.id).join(",");
    const wrapped = exploringStart(EXPLORING_START_ARCHETYPES).jokers
      .map((j) => j.id)
      .join(",");
    expect(wrapped).toBe(a);
  });
});
