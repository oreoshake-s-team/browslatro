import { insertIdAtIndex, nearestGapIndex } from "./reordering";

describe("insertIdAtIndex", () => {
  test("moves an id from index 0 to the end via the trailing gap", () => {
    expect(insertIdAtIndex(["a", "b", "c"], "a", 3)).toEqual(["b", "c", "a"]);
  });

  test("moves an id from the last position to the front via the leading gap", () => {
    expect(insertIdAtIndex(["a", "b", "c"], "c", 0)).toEqual(["c", "a", "b"]);
  });

  test("inserts the source at the requested middle gap when moving left → right", () => {
    expect(insertIdAtIndex(["a", "b", "c", "d"], "a", 3)).toEqual([
      "b",
      "c",
      "a",
      "d",
    ]);
  });

  test("inserts the source at the requested middle gap when moving right → left", () => {
    expect(insertIdAtIndex(["a", "b", "c", "d"], "d", 1)).toEqual([
      "a",
      "d",
      "b",
      "c",
    ]);
  });

  test("returns the same array reference when dropping at the source's left-adjacent gap", () => {
    const ids = ["a", "b", "c"];
    expect(insertIdAtIndex(ids, "b", 1)).toBe(ids);
  });

  test("returns the same array reference when dropping at the source's right-adjacent gap", () => {
    const ids = ["a", "b", "c"];
    expect(insertIdAtIndex(ids, "b", 2)).toBe(ids);
  });

  test("returns the same array reference when the source id is not present", () => {
    const ids = ["a", "b", "c"];
    expect(insertIdAtIndex(ids, "z", 0)).toBe(ids);
  });

  test("does not mutate the input array", () => {
    const ids = ["a", "b", "c"];
    insertIdAtIndex(ids, "a", 3);
    expect(ids).toEqual(["a", "b", "c"]);
  });
});

describe("nearestGapIndex", () => {
  test("returns null when there are no gap rects", () => {
    expect(nearestGapIndex([], 50)).toBeNull();
  });

  test("picks the gap whose center is closest to the cursor", () => {
    expect(
      nearestGapIndex(
        [
          { left: 0, width: 10 },
          { left: 100, width: 10 },
          { left: 200, width: 10 },
        ],
        105,
      ),
    ).toBe(1);
  });

  test("skips gaps that report a zero-rect (non-laid-out elements)", () => {
    expect(
      nearestGapIndex(
        [
          { left: 0, width: 0 },
          { left: 100, width: 10 },
        ],
        0,
      ),
    ).toBe(1);
  });

  test("returns null when every gap reports a zero-rect", () => {
    expect(
      nearestGapIndex(
        [
          { left: 0, width: 0 },
          { left: 0, width: 0 },
        ],
        50,
      ),
    ).toBeNull();
  });
});
