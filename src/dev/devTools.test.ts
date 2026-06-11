import { devToolsEnabled } from "./devTools";

function stubDevToolsFlag(value: string | null) {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) =>
        key === "browslatro:devTools" ? value : null,
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("devToolsEnabled", () => {
  test("true in dev builds regardless of the localStorage flag", () => {
    vi.stubEnv("DEV", true);
    stubDevToolsFlag(null);
    expect(devToolsEnabled()).toBe(true);
  });

  test("true in production when browslatro:devTools is set to 1", () => {
    vi.stubEnv("DEV", false);
    stubDevToolsFlag("1");
    expect(devToolsEnabled()).toBe(true);
  });

  test("false in production when the flag is unset (negative)", () => {
    vi.stubEnv("DEV", false);
    stubDevToolsFlag(null);
    expect(devToolsEnabled()).toBe(false);
  });

  test("false in production for any value other than 1 (negative)", () => {
    vi.stubEnv("DEV", false);
    stubDevToolsFlag("true");
    expect(devToolsEnabled()).toBe(false);
  });

  test("false in production when window is unavailable", () => {
    vi.stubEnv("DEV", false);
    expect(devToolsEnabled()).toBe(false);
  });
});
