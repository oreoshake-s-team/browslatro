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
  "advisor-policy-v8.onnx",
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
  test("falls back to the greedy ranking when the model cannot load", async () => {
    const failures: unknown[] = [];
    const ranker = createAdvisorRanker(new Uint8Array([1, 2, 3]), (e) =>
      failures.push(e),
    );
    const record = fixtureRecord(0);
    const ranking = await ranker.rank(record.state, record.candidates);
    expect({ ranking, failures: failures.length }).toEqual({
      ranking: greedyRanking(record.candidates),
      failures: 1,
    });
  });

  test("reports the fallback only once across calls", async () => {
    const failures: unknown[] = [];
    const ranker = createAdvisorRanker(new Uint8Array([1, 2, 3]), (e) =>
      failures.push(e),
    );
    const record = fixtureRecord(0);
    await ranker.rank(record.state, record.candidates);
    await ranker.rank(record.state, record.candidates);
    expect(failures).toHaveLength(1);
  });

  test("load reports the fallback when the model cannot load", async () => {
    const failures: unknown[] = [];
    const ranker = createAdvisorRanker(new Uint8Array([1, 2, 3]), (e) =>
      failures.push(e),
    );
    await ranker.load();
    expect(failures).toHaveLength(1);
  });

  test("load reports the fallback at most once across load and rank", async () => {
    const failures: unknown[] = [];
    const ranker = createAdvisorRanker(new Uint8Array([1, 2, 3]), (e) =>
      failures.push(e),
    );
    const record = fixtureRecord(0);
    await ranker.load();
    await ranker.rank(record.state, record.candidates);
    expect(failures).toHaveLength(1);
  });

  test("an unencodable state falls back to greedy for that decision", async () => {
    const failures: unknown[] = [];
    const ranker = createAdvisorRanker(readFileSync(MODEL_PATH), (e) =>
      failures.push(e),
    );
    const record = fixtureRecord(0);
    const wideState: ModelState = {
      ...record.state,
      hand: new Array(HAND_SLOTS + 1).fill(record.state.hand[0]),
    };
    const ranking = await ranker.rank(wideState, record.candidates);
    expect({ ranking, failures: failures.length }).toEqual({
      ranking: greedyRanking(record.candidates),
      failures: 1,
    });
  });

  test("ranks with the model again after a per-decision failure", async () => {
    const ranker = createAdvisorRanker(readFileSync(MODEL_PATH));
    const direct = await loadPolicyRanker(readFileSync(MODEL_PATH));
    const record = fixtureRecord(0);
    const wideState: ModelState = {
      ...record.state,
      hand: new Array(HAND_SLOTS + 1).fill(record.state.hand[0]),
    };
    await ranker.rank(wideState, record.candidates);
    expect(await ranker.rank(record.state, record.candidates)).toEqual(
      await direct.rank(record.state, record.candidates),
    );
  });

  test("reports every per-decision fallback", async () => {
    const failures: unknown[] = [];
    const ranker = createAdvisorRanker(readFileSync(MODEL_PATH), (e) =>
      failures.push(e),
    );
    const record = fixtureRecord(0);
    const wideState: ModelState = {
      ...record.state,
      hand: new Array(HAND_SLOTS + 1).fill(record.state.hand[0]),
    };
    await ranker.rank(wideState, record.candidates);
    await ranker.rank(wideState, record.candidates);
    expect(failures).toHaveLength(2);
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
