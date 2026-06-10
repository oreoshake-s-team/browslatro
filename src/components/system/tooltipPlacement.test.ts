import { placeTooltip, type PlacementRect } from "./tooltipPlacement";

const viewport = { width: 1280, height: 720 };
const size = { width: 150, height: 48 };

function rect(left: number, top: number, width: number, height: number): PlacementRect {
  return { left, top, width, height };
}

describe("placeTooltip (#993)", () => {
  const anchor = rect(600, 300, 72, 100);
  // Blocks the whole band above the anchor so tests can isolate the
  // downward-scan behavior.
  const aboveBlocker = rect(0, 150, viewport.width, 140);

  test("keeps the default below-anchor position when nothing is in the way", () => {
    const p = placeTooltip({ anchor, size, obstacles: [], viewport });
    expect(p).toEqual({ top: 408, centerX: 636 });
  });

  test("the anchor itself is not treated as blocking the below position", () => {
    const p = placeTooltip({ anchor, size, obstacles: [anchor], viewport });
    expect(p.top).toBe(408);
  });

  test("hops below a full-width interactive row that the default position would cover", () => {
    const submitRow = rect(0, 410, viewport.width, 40);
    const p = placeTooltip({
      anchor,
      size,
      obstacles: [submitRow, aboveBlocker],
      viewport,
    });
    expect(p).toEqual({ top: 410 + 40 + 8, centerX: 636 });
  });

  test("flips above the anchor when the spot below is covered and above is free", () => {
    const submitRow = rect(0, 410, viewport.width, 40);
    const p = placeTooltip({ anchor, size, obstacles: [submitRow], viewport });
    // Above the anchor: 300 - 8 - 48 — closer to the anchor than hopping
    // below the submit row (displacement 0 vs 50).
    expect(p).toEqual({ top: 300 - 8 - 48, centerX: 636 });
  });

  test("hops past stacked full-width obstacles until it finds clear space", () => {
    const obstacles = [
      rect(0, 410, viewport.width, 40),
      rect(0, 470, viewport.width, 40),
      aboveBlocker,
    ];
    const p = placeTooltip({ anchor, size, obstacles, viewport });
    expect(p.top).toBe(470 + 40 + 8);
  });

  test("flips above the anchor when there is no room below in the viewport", () => {
    const lowAnchor = rect(600, 600, 72, 100);
    const p = placeTooltip({ anchor: lowAnchor, size, obstacles: [], viewport });
    // 600 + 100 + 8 + 48 = 756 > 716, so it goes above: 600 - 8 - 48.
    expect(p).toEqual({ top: 600 - 8 - 48, centerX: 636 });
  });

  test("scanning upward also hops past full-width obstacles", () => {
    const lowAnchor = rect(600, 600, 72, 100);
    const toolbar = rect(0, 540, viewport.width, 30);
    const p = placeTooltip({ anchor: lowAnchor, size, obstacles: [toolbar], viewport });
    // Above-anchor spot (544) covers the toolbar (540..570), so it hops
    // above the toolbar: 540 - 8 - 48.
    expect(p.top).toBe(540 - 8 - 48);
  });

  test("prefers a clear side column over hopping in its own column (joker case)", () => {
    // Anchor near the viewport top: no room above, and a toolbar sits right
    // under it in its own column, while the column one tooltip-width to the
    // right is clear at the natural height.
    const topAnchor = rect(436, 30, 72, 101);
    const obstacles = [
      rect(451, 150, 94, 22), // sort toolbar under the anchor only
      rect(248, 295, 880, 101), // hand cards
    ];
    const p = placeTooltip({ anchor: topAnchor, size, obstacles, viewport });
    expect(p).toEqual({ top: 30 + 101 + 8, centerX: 472 + size.width });
  });

  test("falls back to the legacy below-anchor position when nothing fits", () => {
    const wall = rect(0, 0, viewport.width, viewport.height);
    const p = placeTooltip({ anchor, size, obstacles: [wall], viewport });
    expect(p).toEqual({ top: 408, centerX: 636 });
  });

  test("clamps the horizontal center so the tooltip stays inside the viewport", () => {
    const leftEdgeAnchor = rect(0, 300, 72, 100);
    const p = placeTooltip({ anchor: leftEdgeAnchor, size, obstacles: [], viewport });
    expect(p.centerX).toBe(size.width / 2 + 4);
    const rightEdgeAnchor = rect(1260, 300, 72, 100);
    const q = placeTooltip({ anchor: rightEdgeAnchor, size, obstacles: [], viewport });
    expect(q.centerX).toBe(viewport.width - size.width / 2 - 4);
  });

  test("an element merely touching the tooltip edge does not count as covered", () => {
    // Obstacle starts exactly at the tooltip's bottom edge (top 408 + 48 = 456).
    const touching = rect(0, 455, viewport.width, 40);
    const p = placeTooltip({ anchor, size, obstacles: [touching], viewport });
    expect(p.top).toBe(408);
  });
});
