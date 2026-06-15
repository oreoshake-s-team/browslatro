import { describe, expect, it } from "vitest";
import { pickRandom, pickRandomNonEmpty } from "./random";

describe("pickRandom", () => {
  it("returns undefined for an empty array", () => {
    expect(pickRandom([], () => 0)).toBeUndefined();
  });

  it("picks the first element when rng returns 0", () => {
    expect(pickRandom(["a", "b", "c"], () => 0)).toBe("a");
  });

  it("picks the last element when rng approaches 1", () => {
    expect(pickRandom(["a", "b", "c"], () => 0.999)).toBe("c");
  });

  it("indexes by the floored scaled rng value", () => {
    expect(pickRandom(["a", "b", "c"], () => 0.5)).toBe("b");
  });
});

describe("pickRandomNonEmpty", () => {
  it("returns the selected element", () => {
    expect(pickRandomNonEmpty(["a", "b", "c"], () => 0.999)).toBe("c");
  });

  it("throws for an empty array", () => {
    expect(() => pickRandomNonEmpty([], () => 0)).toThrow();
  });
});
