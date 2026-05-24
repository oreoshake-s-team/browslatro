/**
 * The deterministic-shuffle seam hydrates from localStorage at module import
 * time (mirroring `preferences.ts`), so each test seeds storage and then
 * re-requires `./deck` to observe the desired initial state.
 */

export {};

const STORAGE_KEY = "browslatro:deterministicShuffle";
const INPUT = [1, 2, 3, 4];
const loadShuffle = () =>
  jest.requireActual<typeof import("./deck")>("./deck").shuffle;

describe("shuffle deterministic-shuffle seam", () => {
  beforeEach(() => {
    jest.resetModules();
    window.localStorage.clear();
  });

  test("flag absent → shuffle reorders given a non-identity rng", () => {
    // rng() = 0 forces a non-identity Fisher–Yates output for INPUT.
    expect(loadShuffle()(INPUT, () => 0)).not.toEqual(INPUT);
  });

  test('flag set to "1" → shuffle returns input order unchanged', () => {
    window.localStorage.setItem(STORAGE_KEY, "1");
    expect(loadShuffle()(INPUT, () => 0)).toEqual(INPUT);
  });

  test('flag set to "0" → shuffle still reorders (only "1" enables)', () => {
    window.localStorage.setItem(STORAGE_KEY, "0");
    expect(loadShuffle()(INPUT, () => 0)).not.toEqual(INPUT);
  });

  test('flag set to "false" → shuffle still reorders', () => {
    window.localStorage.setItem(STORAGE_KEY, "false");
    expect(loadShuffle()(INPUT, () => 0)).not.toEqual(INPUT);
  });

  test('flag set to "1" → returned array is a copy, not the same reference', () => {
    window.localStorage.setItem(STORAGE_KEY, "1");
    expect(loadShuffle()(INPUT)).not.toBe(INPUT);
  });
});
