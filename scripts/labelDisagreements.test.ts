import { describe, expect, test, vi } from "vitest";
import {
  candidatesFixture,
  modelStateFixture,
} from "../src/ai/advisor/test-helpers";
import { DATASET_SCHEMA_VERSION, type DatasetRecord } from "../src/ai/dataset";
import type { HandOption } from "../src/ai/getHandOptions";
import type { ModelState } from "../src/ai/modelState";
import type { CandidateRanker } from "../src/ai/policy";
import {
  applyQualityGate,
  createRequestAdviceTeacher,
  findDisagreements,
  isLabelJustified,
  labelDisagreements,
  parseDatasetRecords,
  relabelDisagreements,
  type Disagreement,
} from "./labelDisagreements";

function playOption(cardIds: ReadonlyArray<number>, score: number): HandOption {
  return {
    action: "play",
    cardIds: [...cardIds],
    handLabel: "Pair",
    score,
    chips: score,
    mult: 1,
    notes: [],
  };
}

function discardOption(cardIds: ReadonlyArray<number>): HandOption {
  return { action: "discard", cardIds: [...cardIds], notes: [] };
}

function makeRecord(
  state: ModelState,
  candidates: ReadonlyArray<HandOption>,
  chosenIndex: number,
  runSeed = 1,
): DatasetRecord {
  return {
    schemaVersion: DATASET_SCHEMA_VERSION,
    runSeed,
    ante: 1,
    blind: 1,
    state,
    candidates,
    chosenIndex,
    chosenAction: {
      kind: candidates[chosenIndex].action,
      cardIds: [...candidates[chosenIndex].cardIds],
    },
  };
}

function rankerFrom(
  rankings: Map<ModelState, ReadonlyArray<number>>,
): CandidateRanker {
  return {
    async load() {},
    async rank(state, candidates) {
      return rankings.get(state) ?? candidates.map((_, i) => i);
    },
  };
}

describe("parseDatasetRecords", () => {
  test("parses schemaVersion-1 lines", () => {
    const record = makeRecord(modelStateFixture(), candidatesFixture(), 0);
    const jsonl = `${JSON.stringify(record)}\n`;
    expect(parseDatasetRecords(jsonl)).toHaveLength(1);
  });

  test("skips blank lines", () => {
    const record = makeRecord(modelStateFixture(), candidatesFixture(), 0);
    const jsonl = `\n${JSON.stringify(record)}\n\n`;
    expect(parseDatasetRecords(jsonl)).toHaveLength(1);
  });

  test("drops records that are not schemaVersion 1", () => {
    const stale = { ...makeRecord(modelStateFixture(), candidatesFixture(), 0), schemaVersion: 2 };
    expect(parseDatasetRecords(JSON.stringify(stale))).toHaveLength(0);
  });
});

describe("findDisagreements", () => {
  test("keeps records where the ONNX top-1 differs from the expert pick", async () => {
    const state = modelStateFixture();
    const record = makeRecord(state, candidatesFixture(), 0);
    const ranker = rankerFrom(new Map([[state, [1, 0]]]));
    const disagreements = await findDisagreements([record], ranker);
    expect(disagreements).toHaveLength(1);
  });

  test("reports the onnx and expert indices on a disagreement", async () => {
    const state = modelStateFixture();
    const record = makeRecord(state, candidatesFixture(), 0);
    const ranker = rankerFrom(new Map([[state, [1, 0]]]));
    const [disagreement] = await findDisagreements([record], ranker);
    expect(disagreement).toEqual({ record, expertIndex: 0, onnxIndex: 1 });
  });

  test("excludes records where the ONNX top-1 matches the expert", async () => {
    const state = modelStateFixture();
    const record = makeRecord(state, candidatesFixture(), 0);
    const ranker = rankerFrom(new Map([[state, [0, 1]]]));
    expect(await findDisagreements([record], ranker)).toHaveLength(0);
  });

  test("skips records with no candidates", async () => {
    const record = makeRecord(modelStateFixture(), candidatesFixture(), 0);
    const empty: DatasetRecord = { ...record, candidates: [] };
    const ranker = rankerFrom(new Map());
    expect(await findDisagreements([empty], ranker)).toHaveLength(0);
  });
});

describe("relabelDisagreements", () => {
  function disagreementFixture(): Disagreement {
    const record = makeRecord(modelStateFixture(), candidatesFixture(), 0);
    return { record, expertIndex: 0, onnxIndex: 1 };
  }

  test("emits a record with the teacher's chosen index", async () => {
    const teacher = vi.fn().mockResolvedValue(1);
    const [labeled] = await relabelDisagreements([disagreementFixture()], teacher);
    expect(labeled.chosenIndex).toBe(1);
  });

  test("rewrites chosenAction to match the teacher-chosen candidate", async () => {
    const teacher = vi.fn().mockResolvedValue(1);
    const [labeled] = await relabelDisagreements([disagreementFixture()], teacher);
    expect(labeled.chosenAction).toEqual({ kind: "discard", cardIds: [1] });
  });

  test("preserves schemaVersion and runSeed so the trainer ingests it unchanged", async () => {
    const teacher = vi.fn().mockResolvedValue(1);
    const [labeled] = await relabelDisagreements([disagreementFixture()], teacher);
    expect({ schemaVersion: labeled.schemaVersion, runSeed: labeled.runSeed }).toEqual({
      schemaVersion: 1,
      runSeed: 1,
    });
  });

  test("skips disagreements where the teacher errors or refuses", async () => {
    const teacher = vi.fn().mockResolvedValue(null);
    expect(await relabelDisagreements([disagreementFixture()], teacher)).toHaveLength(0);
  });

  test("skips an out-of-range teacher index", async () => {
    const teacher = vi.fn().mockResolvedValue(99);
    expect(await relabelDisagreements([disagreementFixture()], teacher)).toHaveLength(0);
  });
});

describe("labelDisagreements", () => {
  test("only teacher-labels the disagreeing records", async () => {
    const disagreeState = modelStateFixture();
    const agreeState = modelStateFixture();
    const records = [
      makeRecord(disagreeState, candidatesFixture(), 0, 1),
      makeRecord(agreeState, candidatesFixture(), 0, 2),
    ];
    const ranker = rankerFrom(
      new Map([
        [disagreeState, [1, 0]],
        [agreeState, [0, 1]],
      ]),
    );
    const teacher = vi.fn().mockResolvedValue(1);
    const labeled = await labelDisagreements({ records, ranker, teacher });
    expect(labeled.map((r) => r.runSeed)).toEqual([1]);
  });
});

describe("isLabelJustified", () => {
  test("accepts a discard pick without scoring it", () => {
    const candidates = [playOption([1, 2], 100), discardOption([3])];
    expect(isLabelJustified(candidates, 1)).toBe(true);
  });

  test("accepts the top-scoring play", () => {
    const candidates = [playOption([1, 2], 100), playOption([3], 10)];
    expect(isLabelJustified(candidates, 0)).toBe(true);
  });

  test("rejects a play scoring below the default floor", () => {
    const candidates = [playOption([1, 2], 100), playOption([3], 10)];
    expect(isLabelJustified(candidates, 1)).toBe(false);
  });

  test("accepts a play exactly at the floor", () => {
    const candidates = [playOption([1, 2], 100), playOption([3], 25)];
    expect(isLabelJustified(candidates, 1)).toBe(true);
  });

  test("accepts any play when no play has a positive score", () => {
    const candidates = [playOption([1], 0), discardOption([2])];
    expect(isLabelJustified(candidates, 0)).toBe(true);
  });

  test("returns false for an out-of-range index", () => {
    expect(isLabelJustified([playOption([1], 100)], 5)).toBe(false);
  });

  test("respects a custom minScoreFraction", () => {
    const candidates = [playOption([1, 2], 100), playOption([3], 10)];
    expect(isLabelJustified(candidates, 1, { minScoreFraction: 0.05 })).toBe(true);
  });
});

describe("applyQualityGate", () => {
  test("drops records whose teacher label fails the gate", () => {
    const record = makeRecord(
      modelStateFixture(),
      [playOption([1, 2], 100), playOption([3], 10)],
      1,
    );
    expect(applyQualityGate([record])).toHaveLength(0);
  });

  test("keeps records whose teacher label passes the gate", () => {
    const record = makeRecord(
      modelStateFixture(),
      [playOption([1, 2], 100), playOption([3], 40)],
      1,
    );
    expect(applyQualityGate([record])).toHaveLength(1);
  });
});

describe("labelDisagreements quality gate", () => {
  test("drops a teacher label the engine numbers cannot justify", async () => {
    const state = modelStateFixture();
    const candidates = [playOption([1, 2], 100), playOption([3], 10)];
    const record = makeRecord(state, candidates, 0);
    const ranker = rankerFrom(new Map([[state, [1, 0]]]));
    const teacher = vi.fn().mockResolvedValue(1);
    const labeled = await labelDisagreements({ records: [record], ranker, teacher });
    expect(labeled).toHaveLength(0);
  });
});

describe("createRequestAdviceTeacher", () => {
  test("returns the recommendationIndex when the model succeeds", async () => {
    vi.resetModules();
    vi.doMock("../src/ai/advisor/model", () => ({
      requestAdvice: vi.fn().mockResolvedValue({
        ok: true,
        advice: { recommendationIndex: 2, alternativeIndex: 0, whyAlternativeWorse: "", explanation: "", concept: "" },
      }),
    }));
    const teacher = createRequestAdviceTeacher("sk-test");
    expect(await teacher(modelStateFixture(), candidatesFixture())).toBe(2);
    vi.doUnmock("../src/ai/advisor/model");
  });

  test("returns null when the model fails", async () => {
    vi.resetModules();
    vi.doMock("../src/ai/advisor/model", () => ({
      requestAdvice: vi.fn().mockResolvedValue({ ok: false, status: 502, code: "model_error" }),
    }));
    const teacher = createRequestAdviceTeacher("sk-test");
    expect(await teacher(modelStateFixture(), candidatesFixture())).toBeNull();
    vi.doUnmock("../src/ai/advisor/model");
  });
});
