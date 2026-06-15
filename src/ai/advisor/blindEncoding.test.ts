import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  BLIND_INPUT_FEATURES,
  encodeBlindCandidates,
  type BlindRankInput,
} from "./blindEncoding";
import type { BlindAdviceCandidate } from "./types";

const FIXTURES = join(__dirname, "..", "..", "..", "ml", "tests", "fixtures");

interface GoldenRecord {
  readonly kind: string;
  readonly ante: number;
  readonly scoreTarget: number;
  readonly payout: number;
  readonly money: number;
  readonly jokerCount: number;
  readonly consumableCount: number;
  readonly candidates: ReadonlyArray<{ readonly action: string }>;
}

interface GoldenCase {
  readonly record: GoldenRecord;
  readonly candidates: ReadonlyArray<ReadonlyArray<number>>;
  readonly chosenIndex: number;
}

function recordToInput(rec: GoldenRecord): BlindRankInput {
  const candidates: BlindAdviceCandidate[] = rec.candidates.map((c) =>
    c.action === "play"
      ? { action: "play", scoreTarget: rec.scoreTarget, payout: rec.payout }
      : { action: "skip", tag: { id: "t", name: "Tag", description: "" } },
  );
  return {
    kind: rec.kind,
    ante: rec.ante,
    scoreTarget: rec.scoreTarget,
    payout: rec.payout,
    money: rec.money,
    jokerCount: rec.jokerCount,
    consumableCount: rec.consumableCount,
    candidates,
  };
}

function playSkipInput(overrides: Partial<BlindRankInput> = {}): BlindRankInput {
  return {
    kind: "small",
    ante: 1,
    scoreTarget: 300,
    payout: 3,
    money: 4,
    jokerCount: 0,
    consumableCount: 0,
    candidates: [
      { action: "play", scoreTarget: 300, payout: 3 },
      { action: "skip", tag: { id: "t", name: "Tag", description: "" } },
    ],
    ...overrides,
  };
}

describe("encodeBlindCandidates", () => {
  test("emits one row of BLIND_INPUT_FEATURES per candidate", () => {
    const encoded = encodeBlindCandidates(playSkipInput());
    expect(encoded.length).toBe(2 * BLIND_INPUT_FEATURES);
  });

  test("sets the play flag on the play row", () => {
    const encoded = encodeBlindCandidates(playSkipInput());
    expect(encoded[BLIND_INPUT_FEATURES - 2]).toBe(1);
  });

  test("sets the skip flag on the skip row", () => {
    const encoded = encodeBlindCandidates(playSkipInput());
    expect(encoded[2 * BLIND_INPUT_FEATURES - 1]).toBe(1);
  });

  test("one-hot encodes the blind kind", () => {
    const encoded = encodeBlindCandidates(playSkipInput({ kind: "big" }));
    expect(encoded[3]).toBe(1);
  });
});

describe("encodeBlindCandidates — cross-language golden vectors", () => {
  function goldenCases(): ReadonlyArray<GoldenCase> {
    return JSON.parse(
      readFileSync(join(FIXTURES, "blind-golden.json"), "utf8"),
    ) as GoldenCase[];
  }

  test("matches the Python encoder on all fixture cases", () => {
    for (const { record, candidates: expected } of goldenCases()) {
      const encoded = encodeBlindCandidates(recordToInput(record));
      expect(encoded.length).toBe(expected.length * BLIND_INPUT_FEATURES);
      for (let i = 0; i < expected.length; i++) {
        for (let j = 0; j < BLIND_INPUT_FEATURES; j++) {
          expect(encoded[i * BLIND_INPUT_FEATURES + j]).toBeCloseTo(
            expected[i][j],
            5,
          );
        }
      }
    }
  });

  test("fixture covers small, big, and boss blinds", () => {
    const kinds = goldenCases().map((c) => c.record.kind);
    expect(kinds).toContain("small");
    expect(kinds).toContain("big");
    expect(kinds).toContain("boss");
  });
});
