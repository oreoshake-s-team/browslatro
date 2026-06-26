// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { HAND_SLOTS } from "./encode";
import type { HandOption } from "./getHandOptions";
import type { ModelState } from "./modelState";
import {
  createAdvisorRanker,
  greedyRanker,
  greedyRanking,
  loadPolicyRanker,
} from "./policy";

const MODEL_PATH = join(
  __dirname,
  "..",
  "..",
  "public",
  "models",
  "advisor-policy-v9.onnx",
);
const FIXTURE_PATH = join(
  __dirname,
  "..",
  "..",
  "ml",
  "tests",
  "fixtures",
  "sample.jsonl",
);

interface FixtureRecord {
  readonly state: ModelState;
  readonly candidates: ReadonlyArray<HandOption>;
}

function fixtureRecord(index: number): FixtureRecord {
  const lines = readFileSync(FIXTURE_PATH, "utf8").trim().split("\n");
  return JSON.parse(lines[index]) as FixtureRecord;
}

function playOption(score: number, ids: ReadonlyArray<number>): HandOption {
  return {
    action: "play",
    cardIds: ids,
    handLabel: "Pair",
    score,
    chips: score / 2,
    mult: 2,
    notes: [],
  };
}

describe("greedyRanking", () => {
  test("ranks plays by score descending ahead of discards", () => {
    const candidates: HandOption[] = [
      { action: "discard", cardIds: [9], notes: [] },
      playOption(50, [1]),
      playOption(200, [2]),
    ];
    expect(greedyRanking(candidates)).toEqual([2, 1, 0]);
  });

  test("returns an empty ranking for no candidates", () => {
    expect(greedyRanking([])).toEqual([]);
  });
});

describe("greedyRanker", () => {
  test("load resolves instantly without downloading a model", async () => {
    await expect(greedyRanker().load()).resolves.toBeUndefined();
  });

  test("rank returns the greedy ordering of the candidates", async () => {
    const candidates: HandOption[] = [
      { action: "discard", cardIds: [9], notes: [] },
      playOption(50, [1]),
      playOption(200, [2]),
    ];
    const ranking = await greedyRanker().rank({} as ModelState, candidates);
    expect(ranking).toEqual([2, 1, 0]);
  });
});

describe("createAdvisorRanker", () => {
  test("rank rejects when the model cannot load", async () => {
    const ranker = createAdvisorRanker(new Uint8Array([1, 2, 3]));
    const record = fixtureRecord(0);
    await expect(
      ranker.rank(record.state, record.candidates),
    ).rejects.toThrow();
  });

  test("does not serve a greedy ranking when the model is unavailable", async () => {
    const ranker = createAdvisorRanker(new Uint8Array([1, 2, 3]));
    const record = fixtureRecord(0);
    const outcome = await ranker
      .rank(record.state, record.candidates)
      .then((ranking) => ({ rejected: false, ranking }))
      .catch(() => ({ rejected: true, ranking: null }));
    expect(outcome).toEqual({ rejected: true, ranking: null });
  });

  test("load rejects when the model cannot load", async () => {
    const ranker = createAdvisorRanker(new Uint8Array([1, 2, 3]));
    await expect(ranker.load()).rejects.toThrow();
  });

  test("a per-decision encoding failure rejects instead of falling back to greedy", async () => {
    const ranker = createAdvisorRanker(readFileSync(MODEL_PATH));
    const record = fixtureRecord(0);
    const wideState: ModelState = {
      ...record.state,
      hand: new Array(HAND_SLOTS + 1).fill(record.state.hand[0]),
    };
    await expect(ranker.rank(wideState, record.candidates)).rejects.toThrow();
  });

  test("still ranks valid decisions with the model after a per-decision failure", async () => {
    const ranker = createAdvisorRanker(readFileSync(MODEL_PATH));
    const direct = await loadPolicyRanker(readFileSync(MODEL_PATH));
    const record = fixtureRecord(0);
    const wideState: ModelState = {
      ...record.state,
      hand: new Array(HAND_SLOTS + 1).fill(record.state.hand[0]),
    };
    await ranker.rank(wideState, record.candidates).catch(() => undefined);
    expect(await ranker.rank(record.state, record.candidates)).toEqual(
      await direct.rank(record.state, record.candidates),
    );
  });
});

describe("loadPolicyRanker", () => {
  test("ranks fixture candidates with the committed model", async () => {
    const ranker = await loadPolicyRanker(readFileSync(MODEL_PATH));
    const record = fixtureRecord(0);
    const ranking = await ranker.rank(record.state, record.candidates);
    expect([...ranking].sort((a, b) => a - b)).toEqual(
      record.candidates.map((_, i) => i),
    );
  });

  test("ranks an empty candidate list as empty", async () => {
    const ranker = await loadPolicyRanker(readFileSync(MODEL_PATH));
    expect(await ranker.rank(fixtureRecord(0).state, [])).toEqual([]);
  });
});
