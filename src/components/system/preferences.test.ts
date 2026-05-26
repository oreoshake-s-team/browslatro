export {};

const STORAGE_KEY = "browslatro:highVisibility";
const MUTED_KEY = "browslatro:muted";
const ANIMATION_SPEED_KEY = "browslatro:animationSpeed";

async function loadPreferences(): Promise<typeof import("./preferences")> {
  return await import("./preferences");
}

describe("preferences (highVisibility)", () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
  });

  test("defaults to false when localStorage has no value", async () => {
    const { isHighVisibility } = await loadPreferences();
    expect(isHighVisibility()).toBe(false);
  });

  test("reads a persisted true value from localStorage on init", async () => {
    window.localStorage.setItem(STORAGE_KEY, "true");
    const { isHighVisibility } = await loadPreferences();
    expect(isHighVisibility()).toBe(true);
  });

  test("reads a persisted false value from localStorage on init", async () => {
    window.localStorage.setItem(STORAGE_KEY, "false");
    const { isHighVisibility } = await loadPreferences();
    expect(isHighVisibility()).toBe(false);
  });

  test("toggleHighVisibility flips the in-memory value", async () => {
    const { isHighVisibility, toggleHighVisibility } = await loadPreferences();
    toggleHighVisibility();
    expect(isHighVisibility()).toBe(true);
  });

  test("toggleHighVisibility writes true to localStorage", async () => {
    const { toggleHighVisibility } = await loadPreferences();
    toggleHighVisibility();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("true");
  });

  test("toggling twice writes false back to localStorage", async () => {
    const { toggleHighVisibility } = await loadPreferences();
    toggleHighVisibility();
    toggleHighVisibility();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("false");
  });

  test("ignores unrelated stored values and defaults to false", async () => {
    window.localStorage.setItem(STORAGE_KEY, "yes");
    const { isHighVisibility } = await loadPreferences();
    expect(isHighVisibility()).toBe(false);
  });
});

describe("preferences (muted)", () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
  });

  test("defaults to false when localStorage has no value", async () => {
    const { isMuted } = await loadPreferences();
    expect(isMuted()).toBe(false);
  });

  test("reads a persisted true value from localStorage on init", async () => {
    window.localStorage.setItem(MUTED_KEY, "true");
    const { isMuted } = await loadPreferences();
    expect(isMuted()).toBe(true);
  });

  test("toggleMute flips the in-memory value", async () => {
    const { isMuted, toggleMute } = await loadPreferences();
    toggleMute();
    expect(isMuted()).toBe(true);
  });

  test("toggleMute writes true to localStorage", async () => {
    const { toggleMute } = await loadPreferences();
    toggleMute();
    expect(window.localStorage.getItem(MUTED_KEY)).toBe("true");
  });

  test("toggling twice writes false back to localStorage", async () => {
    const { toggleMute } = await loadPreferences();
    toggleMute();
    toggleMute();
    expect(window.localStorage.getItem(MUTED_KEY)).toBe("false");
  });
});

describe("preferences (animationSpeed)", () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
  });

  test("defaults to normal when localStorage has no value", async () => {
    const { getAnimationSpeed } = await loadPreferences();
    expect(getAnimationSpeed()).toBe("normal");
  });

  test("reads a persisted fast value from localStorage on init", async () => {
    window.localStorage.setItem(ANIMATION_SPEED_KEY, "fast");
    const { getAnimationSpeed } = await loadPreferences();
    expect(getAnimationSpeed()).toBe("fast");
  });

  test("falls back to normal when an unknown value is stored", async () => {
    window.localStorage.setItem(ANIMATION_SPEED_KEY, "lightspeed");
    const { getAnimationSpeed } = await loadPreferences();
    expect(getAnimationSpeed()).toBe("normal");
  });

  test("setAnimationSpeed persists the value to localStorage", async () => {
    const { setAnimationSpeed } = await loadPreferences();
    setAnimationSpeed("instant");
    expect(window.localStorage.getItem(ANIMATION_SPEED_KEY)).toBe("instant");
  });

  test("setAnimationSpeed roundtrips through localStorage to a re-imported module", async () => {
    const first = await loadPreferences();
    first.setAnimationSpeed("slow");
    vi.resetModules();
    const second = await loadPreferences();
    expect(second.getAnimationSpeed()).toBe("slow");
  });

  test.each<{ speed: "normal" | "instant"; expected: number }>([
    { speed: "normal", expected: 1 },
    { speed: "instant", expected: 0 },
  ])("getAnimationSpeedMultiplier returns $expected for $speed", async ({ speed, expected }) => {
    const { getAnimationSpeedMultiplier } = await loadPreferences();
    expect(getAnimationSpeedMultiplier(speed)).toBe(expected);
  });

  test.each<{ speed: "normal" | "slow"; expected: boolean }>([
    { speed: "normal", expected: false },
    { speed: "slow", expected: true },
  ])("hasUserOverriddenAnimationSpeed is $expected for $speed", async ({ speed, expected }) => {
    const { hasUserOverriddenAnimationSpeed } = await loadPreferences();
    expect(hasUserOverriddenAnimationSpeed(speed)).toBe(expected);
  });
});
