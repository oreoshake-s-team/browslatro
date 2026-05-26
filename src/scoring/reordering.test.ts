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
  function makeContainer(rects: ReadonlyArray<{ left: number; width: number }>) {
    const container = document.createElement("div");
    rects.forEach((r) => {
      const gap = document.createElement("span");
      gap.className = "gap";
      gap.getBoundingClientRect = () =>
        ({ left: r.left, width: r.width, right: r.left + r.width, top: 0, bottom: 0, height: 0, x: r.left, y: 0, toJSON: () => ({}) }) as DOMRect;
      container.appendChild(gap);
    });
    return container;
  }

  test("returns null when the container is null", () => {
    expect(nearestGapIndex(null, 100, ".gap")).toBeNull();
  });

  test("picks the gap whose center is closest to the cursor", () => {
    const container = makeContainer([
      { left: 0, width: 10 },
      { left: 100, width: 10 },
      { left: 200, width: 10 },
    ]);
    expect(nearestGapIndex(container, 105, ".gap")).toBe(1);
  });

  test("skips gaps that report a zero-rect (jsdom non-laid-out elements)", () => {
    const container = makeContainer([
      { left: 0, width: 0 },
      { left: 100, width: 10 },
    ]);
    expect(nearestGapIndex(container, 0, ".gap")).toBe(1);
  });

  test("returns null when no gaps match the selector", () => {
    const container = document.createElement("div");
    expect(nearestGapIndex(container, 50, ".gap")).toBeNull();
  });
});
