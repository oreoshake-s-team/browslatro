export {};

const STORAGE_KEY = "browslatro:highVisibility";
const MUTED_KEY = "browslatro:muted";
const ANIMATION_SPEED_KEY = "browslatro:animationSpeed";

describe("preferences (highVisibility)", () => {
  beforeEach(() => {
    jest.resetModules();
    window.localStorage.clear();
  });

  test("defaults to false when localStorage has no value", () => {
    const { isHighVisibility } = jest.requireActual<typeof import("./preferences")>("./preferences");
    expect(isHighVisibility()).toBe(false);
  });

  test("reads a persisted true value from localStorage on init", () => {
    window.localStorage.setItem(STORAGE_KEY, "true");
    const { isHighVisibility } = jest.requireActual<typeof import("./preferences")>("./preferences");
    expect(isHighVisibility()).toBe(true);
  });

  test("reads a persisted false value from localStorage on init", () => {
    window.localStorage.setItem(STORAGE_KEY, "false");
    const { isHighVisibility } = jest.requireActual<typeof import("./preferences")>("./preferences");
    expect(isHighVisibility()).toBe(false);
  });

  test("toggleHighVisibility flips the in-memory value", () => {
    const { isHighVisibility, toggleHighVisibility } = jest.requireActual<typeof import("./preferences")>("./preferences");
    toggleHighVisibility();
    expect(isHighVisibility()).toBe(true);
  });

  test("toggleHighVisibility writes true to localStorage", () => {
    const { toggleHighVisibility } = jest.requireActual<typeof import("./preferences")>("./preferences");
    toggleHighVisibility();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("true");
  });

  test("toggling twice writes false back to localStorage", () => {
    const { toggleHighVisibility } = jest.requireActual<typeof import("./preferences")>("./preferences");
    toggleHighVisibility();
    toggleHighVisibility();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("false");
  });

  test("ignores unrelated stored values and defaults to false", () => {
    window.localStorage.setItem(STORAGE_KEY, "yes");
    const { isHighVisibility } = jest.requireActual<typeof import("./preferences")>("./preferences");
    expect(isHighVisibility()).toBe(false);
  });
});

describe("preferences (muted)", () => {
  beforeEach(() => {
    jest.resetModules();
    window.localStorage.clear();
  });

  test("defaults to false when localStorage has no value", () => {
    const { isMuted } = jest.requireActual<typeof import("./preferences")>("./preferences");
    expect(isMuted()).toBe(false);
  });

  test("reads a persisted true value from localStorage on init", () => {
    window.localStorage.setItem(MUTED_KEY, "true");
    const { isMuted } = jest.requireActual<typeof import("./preferences")>("./preferences");
    expect(isMuted()).toBe(true);
  });

  test("toggleMute flips the in-memory value", () => {
    const { isMuted, toggleMute } = jest.requireActual<typeof import("./preferences")>("./preferences");
    toggleMute();
    expect(isMuted()).toBe(true);
  });

  test("toggleMute writes true to localStorage", () => {
    const { toggleMute } = jest.requireActual<typeof import("./preferences")>("./preferences");
    toggleMute();
    expect(window.localStorage.getItem(MUTED_KEY)).toBe("true");
  });

  test("toggling twice writes false back to localStorage", () => {
    const { toggleMute } = jest.requireActual<typeof import("./preferences")>("./preferences");
    toggleMute();
    toggleMute();
    expect(window.localStorage.getItem(MUTED_KEY)).toBe("false");
  });
});

describe("preferences (animationSpeed)", () => {
  beforeEach(() => {
    jest.resetModules();
    window.localStorage.clear();
  });

  test("defaults to normal when localStorage has no value", () => {
    const { getAnimationSpeed } = jest.requireActual<typeof import("./preferences")>("./preferences");
    expect(getAnimationSpeed()).toBe("normal");
  });

  test("reads a persisted fast value from localStorage on init", () => {
    window.localStorage.setItem(ANIMATION_SPEED_KEY, "fast");
    const { getAnimationSpeed } = jest.requireActual<typeof import("./preferences")>("./preferences");
    expect(getAnimationSpeed()).toBe("fast");
  });

  test("falls back to normal when an unknown value is stored", () => {
    window.localStorage.setItem(ANIMATION_SPEED_KEY, "lightspeed");
    const { getAnimationSpeed } = jest.requireActual<typeof import("./preferences")>("./preferences");
    expect(getAnimationSpeed()).toBe("normal");
  });

  test("setAnimationSpeed persists the value to localStorage", () => {
    const { setAnimationSpeed } = jest.requireActual<typeof import("./preferences")>("./preferences");
    setAnimationSpeed("instant");
    expect(window.localStorage.getItem(ANIMATION_SPEED_KEY)).toBe("instant");
  });

  test("setAnimationSpeed roundtrips through localStorage to a re-imported module", () => {
    const first = jest.requireActual<typeof import("./preferences")>("./preferences");
    first.setAnimationSpeed("slow");
    jest.resetModules();
    const second = jest.requireActual<typeof import("./preferences")>("./preferences");
    expect(second.getAnimationSpeed()).toBe("slow");
  });

  test("getAnimationSpeedMultiplier returns 1 for normal", () => {
    const { getAnimationSpeedMultiplier } = jest.requireActual<typeof import("./preferences")>("./preferences");
    expect(getAnimationSpeedMultiplier("normal")).toBe(1);
  });

  test("getAnimationSpeedMultiplier returns 0 for instant", () => {
    const { getAnimationSpeedMultiplier } = jest.requireActual<typeof import("./preferences")>("./preferences");
    expect(getAnimationSpeedMultiplier("instant")).toBe(0);
  });

  test("hasUserOverriddenAnimationSpeed is false for normal", () => {
    const { hasUserOverriddenAnimationSpeed } = jest.requireActual<typeof import("./preferences")>("./preferences");
    expect(hasUserOverriddenAnimationSpeed("normal")).toBe(false);
  });

  test("hasUserOverriddenAnimationSpeed is true for slow", () => {
    const { hasUserOverriddenAnimationSpeed } = jest.requireActual<typeof import("./preferences")>("./preferences");
    expect(hasUserOverriddenAnimationSpeed("slow")).toBe(true);
  });
});
