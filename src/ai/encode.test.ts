// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  CANDIDATE_FEATURES,
  CARD_FEATURES,
  INPUT_FEATURES,
  STATE_FEATURES,
  encodeCandidate,
  encodeDecision,
  encodeState,
} from "./encode";
import type { HandOption } from "./getHandOptions";
import type { ModelState } from "./modelState";

const FIXTURES = join(__dirname, "..", "..", "ml", "tests", "fixtures");

interface FixtureRecord {
  readonly state: ModelState;
  readonly candidates: ReadonlyArray<HandOption>;
  readonly chosenIndex: number;
}

function fixtureRecords(): FixtureRecord[] {
  return readFileSync(join(FIXTURES, "sample.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as FixtureRecord);
}

interface GoldenDecision {
  readonly chosenIndex: number;
  readonly inputs: ReadonlyArray<ReadonlyArray<number>>;
}

function goldenDecisions(): GoldenDecision[] {
  return JSON.parse(
    readFileSync(join(FIXTURES, "sample-encoded.json"), "utf8"),
  ) as GoldenDecision[];
}

describe("encode — cross-language golden vectors", () => {
  test("matches the Python encoder on fixture decisions", () => {
    const records = fixtureRecords();
    const golden = goldenDecisions();
    for (let i = 0; i < golden.length; i += 1) {
      const encoded = encodeDecision(records[i].state, records[i].candidates);
      const expected = golden[i].inputs.flat();
      expect(encoded.length).toBe(expected.length);
      for (let j = 0; j < expected.length; j += 1) {
        expect(encoded[j]).toBeCloseTo(expected[j], 5);
      }
    }
  });
});

describe("encode — shape contracts", () => {
  const sample = fixtureRecords()[0];

  test("state vectors have the documented length", () => {
    expect(encodeState(sample.state)).toHaveLength(STATE_FEATURES);
  });

  test("candidate vectors have the documented length", () => {
    expect(encodeCandidate(sample.candidates[0], sample.state)).toHaveLength(
      CANDIDATE_FEATURES,
    );
  });

  test("decision encoding is one row of INPUT_FEATURES per candidate", () => {
    const encoded = encodeDecision(sample.state, sample.candidates);
    expect(encoded.length).toBe(sample.candidates.length * INPUT_FEATURES);
  });

  test("a face-down card hides everything but presence flags", () => {
    const state: ModelState = {
      ...sample.state,
      hand: [{ id: 1, faceDown: true }],
    };
    expect(encodeState(state).slice(0, CARD_FEATURES)).toEqual([
      1,
      1,
      ...new Array<number>(CARD_FEATURES - 2).fill(0),
    ]);
  });

  test("a ten-card hand fills the ninth and tenth slots", () => {
    const state: ModelState = {
      ...sample.state,
      hand: new Array(10).fill(sample.state.hand[0]),
    };
    const vector = encodeState(state);
    expect([vector[9 * CARD_FEATURES], vector[10 * CARD_FEATURES]]).toEqual([
      1, 0,
    ]);
  });

  test("an oversized hand is rejected", () => {
    const state: ModelState = {
      ...sample.state,
      hand: new Array(17).fill(sample.state.hand[0]),
    };
    expect(() => encodeState(state)).toThrow("max 16");
  });

  test("a candidate referencing a foreign card is rejected", () => {
    const candidate: HandOption = {
      ...sample.candidates[0],
      cardIds: [987654],
    } as HandOption;
    expect(() => encodeCandidate(candidate, sample.state)).toThrow(
      "not in hand",
    );
  });
});
