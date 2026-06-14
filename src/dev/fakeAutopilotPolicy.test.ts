import { fakeAutopilotPolicyEnabled } from "./fakeAutopilotPolicy";

function stubFlag(value: string | null): void {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) =>
        key === "browslatro:fakeAutopilotPolicy" ? value : null,
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fakeAutopilotPolicyEnabled", () => {
  test("true when the flag is set to 1", () => {
    stubFlag("1");
    expect(fakeAutopilotPolicyEnabled()).toBe(true);
  });

  test("false when the flag is unset (negative)", () => {
    stubFlag(null);
    expect(fakeAutopilotPolicyEnabled()).toBe(false);
  });

  test("false when reading localStorage throws (negative)", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
      },
    });
    expect(fakeAutopilotPolicyEnabled()).toBe(false);
  });
});
