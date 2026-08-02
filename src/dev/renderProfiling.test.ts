import {
  getRenderProfilingRecords,
  isRenderProfilingEnabled,
  recordRender,
  resetRenderProfilingRecords,
} from "./renderProfiling";

function stubRenderProfilingFlag(value: string | null) {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) =>
        key === "browslatro:renderProfiling" ? value : null,
    },
  });
}

beforeEach(() => {
  resetRenderProfilingRecords();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isRenderProfilingEnabled", () => {
  test("true when browslatro:renderProfiling is set to 1", () => {
    stubRenderProfilingFlag("1");
    expect(isRenderProfilingEnabled()).toBe(true);
  });

  test("false when the flag is unset (negative)", () => {
    stubRenderProfilingFlag(null);
    expect(isRenderProfilingEnabled()).toBe(false);
  });

  test("false when localStorage access throws", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
      },
    });
    expect(isRenderProfilingEnabled()).toBe(false);
  });
});

describe("recordRender / getRenderProfilingRecords", () => {
  test("accumulates records in order", () => {
    recordRender({
      id: "Round",
      phase: "mount",
      actualDuration: 1,
      baseDuration: 1,
      startTime: 0,
      commitTime: 1,
    });
    recordRender({
      id: "HandScore",
      phase: "update",
      actualDuration: 2,
      baseDuration: 2,
      startTime: 1,
      commitTime: 3,
    });
    expect(getRenderProfilingRecords().map((r) => r.id)).toEqual([
      "Round",
      "HandScore",
    ]);
  });
});

describe("resetRenderProfilingRecords", () => {
  test("clears accumulated records", () => {
    recordRender({
      id: "Round",
      phase: "mount",
      actualDuration: 1,
      baseDuration: 1,
      startTime: 0,
      commitTime: 1,
    });
    resetRenderProfilingRecords();
    expect(getRenderProfilingRecords()).toEqual([]);
  });
});
