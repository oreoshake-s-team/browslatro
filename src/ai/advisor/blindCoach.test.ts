import { describe, expect, test } from "vitest";
import { rankBlind } from "./blindCoach";
import type { BlindAdviceCandidate } from "./types";

function candidates(tagId: string): ReadonlyArray<BlindAdviceCandidate> {
  return [
    { action: "play", scoreTarget: 300, payout: 3 },
    { action: "skip", tag: { id: tagId, name: "Tag", description: "" } },
  ];
}

describe("rankBlind", () => {
  test("recommends skip for a strong tag when the build can coast", () => {
    expect(
      rankBlind({ ante: 1, jokerCount: 0, candidates: candidates("rare") })[0],
    ).toBe(1);
  });

  test("recommends play for a strong tag when the build cannot coast", () => {
    expect(
      rankBlind({ ante: 6, jokerCount: 0, candidates: candidates("rare") })[0],
    ).toBe(0);
  });

  test("recommends play for a weak tag even when able to coast", () => {
    expect(
      rankBlind({ ante: 1, jokerCount: 5, candidates: candidates("handy") })[0],
    ).toBe(0);
  });

  test("coasting scales with ante", () => {
    expect(
      rankBlind({ ante: 5, jokerCount: 4, candidates: candidates("voucher") })[0],
    ).toBe(1);
  });

  test("returns both candidate indices", () => {
    expect(
      rankBlind({ ante: 1, jokerCount: 0, candidates: candidates("rare") }),
    ).toHaveLength(2);
  });
});
