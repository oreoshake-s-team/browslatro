/**
 * The preferences module hydrates from localStorage at import time, so each
 * test must seed storage and then re-require the module to observe the
 * desired initial state.
 */

export {};

const STORAGE_KEY = "browslatro:highVisibility";
const MUTED_KEY = "browslatro:muted";

describe("preferences (highVisibility)", () => {
  beforeEach(() => {
    jest.resetModules();
    window.localStorage.clear();
  });

  test("defaults to false when localStorage has no value", () => {
    const { isHighVisibility } = require("./preferences");
    expect(isHighVisibility()).toBe(false);
  });

  test("reads a persisted true value from localStorage on init", () => {
    window.localStorage.setItem(STORAGE_KEY, "true");
    const { isHighVisibility } = require("./preferences");
    expect(isHighVisibility()).toBe(true);
  });

  test("reads a persisted false value from localStorage on init", () => {
    window.localStorage.setItem(STORAGE_KEY, "false");
    const { isHighVisibility } = require("./preferences");
    expect(isHighVisibility()).toBe(false);
  });

  test("toggleHighVisibility flips the in-memory value", () => {
    const { isHighVisibility, toggleHighVisibility } = require("./preferences");
    toggleHighVisibility();
    expect(isHighVisibility()).toBe(true);
  });

  test("toggleHighVisibility writes true to localStorage", () => {
    const { toggleHighVisibility } = require("./preferences");
    toggleHighVisibility();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("true");
  });

  test("toggling twice writes false back to localStorage", () => {
    const { toggleHighVisibility } = require("./preferences");
    toggleHighVisibility();
    toggleHighVisibility();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("false");
  });

  test("ignores unrelated stored values and defaults to false", () => {
    window.localStorage.setItem(STORAGE_KEY, "yes");
    const { isHighVisibility } = require("./preferences");
    expect(isHighVisibility()).toBe(false);
  });
});

describe("preferences (muted)", () => {
  beforeEach(() => {
    jest.resetModules();
    window.localStorage.clear();
  });

  test("defaults to false when localStorage has no value", () => {
    const { isMuted } = require("./preferences");
    expect(isMuted()).toBe(false);
  });

  test("reads a persisted true value from localStorage on init", () => {
    window.localStorage.setItem(MUTED_KEY, "true");
    const { isMuted } = require("./preferences");
    expect(isMuted()).toBe(true);
  });

  test("toggleMute flips the in-memory value", () => {
    const { isMuted, toggleMute } = require("./preferences");
    toggleMute();
    expect(isMuted()).toBe(true);
  });

  test("toggleMute writes true to localStorage", () => {
    const { toggleMute } = require("./preferences");
    toggleMute();
    expect(window.localStorage.getItem(MUTED_KEY)).toBe("true");
  });

  test("toggling twice writes false back to localStorage", () => {
    const { toggleMute } = require("./preferences");
    toggleMute();
    toggleMute();
    expect(window.localStorage.getItem(MUTED_KEY)).toBe("false");
  });
});
