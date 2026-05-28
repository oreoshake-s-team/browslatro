/**
 * The deterministic-shuffle seam hydrates from localStorage at module import
 * time (mirroring `preferences.ts`), so each test seeds storage and then
 * re-imports `./deck` to observe the desired initial state.
 */

import "../test/memoryLocalStorage";

const STORAGE_KEY = "browslatro:deterministicShuffle";
const INPUT = [1, 2, 3, 4];
const loadShuffle = async () => (await import("./deck")).shuffle;

describe("shuffle deterministic-shuffle seam", () => {
  beforeEach(() => {
    vi.resetModules();
    window.localStorage.clear();
  });

  test("flag absent → shuffle reorders given a non-identity rng", async () => {
    expect((await loadShuffle())(INPUT, () => 0)).not.toEqual(INPUT);
  });

  test('flag set to "1" → shuffle returns input order unchanged', async () => {
    window.localStorage.setItem(STORAGE_KEY, "1");
    expect((await loadShuffle())(INPUT, () => 0)).toEqual(INPUT);
  });

  test('flag set to "0" → shuffle still reorders (only "1" enables)', async () => {
    window.localStorage.setItem(STORAGE_KEY, "0");
    expect((await loadShuffle())(INPUT, () => 0)).not.toEqual(INPUT);
  });

  test('flag set to "false" → shuffle still reorders', async () => {
    window.localStorage.setItem(STORAGE_KEY, "false");
    expect((await loadShuffle())(INPUT, () => 0)).not.toEqual(INPUT);
  });

  test('flag set to "1" → returned array is a copy, not the same reference', async () => {
    window.localStorage.setItem(STORAGE_KEY, "1");
    expect((await loadShuffle())(INPUT)).not.toBe(INPUT);
  });
});
