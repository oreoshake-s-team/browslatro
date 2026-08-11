export interface PlacementRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface PlacementSize {
  readonly width: number;
  readonly height: number;
}

export interface TooltipPlacement {
  /** Viewport-space top of the tooltip. */
  readonly top: number;
  /** Viewport-space horizontal center of the tooltip. */
  readonly centerX: number;
}

const VIEWPORT_MARGIN = 4;
const MAX_SCAN_STEPS = 20;

// Far enough to hop a toolbar or badge row, near enough that the tooltip
// stays visually attached to its anchor.
const MAX_DISPLACEMENT_PX = 160;

/** Overlap smaller than this is treated as touching, not covering. */
const OVERLAP_SLACK_PX = 2;

function overlaps(a: PlacementRect, b: PlacementRect): boolean {
  const x = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
  const y = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
  return x > OVERLAP_SLACK_PX && y > OVERLAP_SLACK_PX;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function scanDown(
  startTop: number,
  left: number,
  size: PlacementSize,
  obstacles: ReadonlyArray<PlacementRect>,
  viewport: PlacementSize,
  offset: number,
): number | null {
  let top = startTop;
  for (let step = 0; step < MAX_SCAN_STEPS; step += 1) {
    if (top + size.height > viewport.height - VIEWPORT_MARGIN) return null;
    const candidate: PlacementRect = { left, top, width: size.width, height: size.height };
    const hits = obstacles.filter((o) => overlaps(candidate, o));
    if (hits.length === 0) return top;
    top = Math.max(...hits.map((o) => o.top + o.height)) + offset;
  }
  return null;
}

function scanUp(
  startTop: number,
  left: number,
  size: PlacementSize,
  obstacles: ReadonlyArray<PlacementRect>,
  offset: number,
): number | null {
  let top = startTop;
  for (let step = 0; step < MAX_SCAN_STEPS; step += 1) {
    if (top < VIEWPORT_MARGIN) return null;
    const candidate: PlacementRect = { left, top, width: size.width, height: size.height };
    const hits = obstacles.filter((o) => overlaps(candidate, o));
    if (hits.length === 0) return top;
    top = Math.min(...hits.map((o) => o.top)) - offset - size.height;
  }
  return null;
}

/**
 * Choose a tooltip position near the anchor, avoiding interactive elements
 * when possible. Candidate spots are searched in three columns — the
 * anchor's horizontal center, then one tooltip-width right and left of it
 * (all clamped into the viewport) — by scanning downward from just below
 * the anchor (hopping past each obstacle the tooltip would cover) and
 * upward from just above it. Among the clear spots, the one displaced
 * least from the natural below-the-anchor position wins, and spots
 * displaced beyond MAX_DISPLACEMENT_PX are rejected outright: the tooltip
 * is pointer-events-none, so briefly covering other UI beats visually
 * detaching from its anchor. When no clear spot exists within the cap, it
 * sits directly below the anchor, flipping above when below would leave
 * the viewport and clamping into the viewport as a last resort.
 */
export function placeTooltip(options: {
  readonly anchor: PlacementRect;
  readonly size: PlacementSize;
  readonly obstacles: ReadonlyArray<PlacementRect>;
  readonly viewport: PlacementSize;
  readonly offset?: number;
}): TooltipPlacement {
  const { anchor, size, obstacles, viewport, offset = 8 } = options;
  const minCenterX = size.width / 2 + VIEWPORT_MARGIN;
  const maxCenterX = Math.max(minCenterX, viewport.width - size.width / 2 - VIEWPORT_MARGIN);
  const anchorCenterX = clamp(anchor.left + anchor.width / 2, minCenterX, maxCenterX);

  const columns = [
    anchorCenterX,
    clamp(anchorCenterX + size.width, minCenterX, maxCenterX),
    clamp(anchorCenterX - size.width, minCenterX, maxCenterX),
  ].filter((centerX, idx, arr) => arr.indexOf(centerX) === idx);

  const belowAnchor = anchor.top + anchor.height + offset;
  const aboveAnchor = anchor.top - offset - size.height;
  let best: (TooltipPlacement & { readonly displacement: number }) | null = null;
  for (const centerX of columns) {
    const left = centerX - size.width / 2;
    const down = scanDown(belowAnchor, left, size, obstacles, viewport, offset);
    if (
      down !== null &&
      down - belowAnchor <= MAX_DISPLACEMENT_PX &&
      (best === null || down - belowAnchor < best.displacement)
    ) {
      best = { top: down, centerX, displacement: down - belowAnchor };
    }
    const up = scanUp(aboveAnchor, left, size, obstacles, offset);
    if (
      up !== null &&
      aboveAnchor - up <= MAX_DISPLACEMENT_PX &&
      (best === null || aboveAnchor - up < best.displacement)
    ) {
      best = { top: up, centerX, displacement: aboveAnchor - up };
    }
  }
  if (best !== null) return { top: best.top, centerX: best.centerX };

  if (belowAnchor + size.height <= viewport.height - VIEWPORT_MARGIN) {
    return { top: belowAnchor, centerX: anchorCenterX };
  }
  if (aboveAnchor >= VIEWPORT_MARGIN) {
    return { top: aboveAnchor, centerX: anchorCenterX };
  }
  return {
    top: clamp(
      belowAnchor,
      VIEWPORT_MARGIN,
      viewport.height - size.height - VIEWPORT_MARGIN,
    ),
    centerX: anchorCenterX,
  };
}

// Disabled controls count too: they are visible UI the tooltip would hide,
// and they can become enabled while the tooltip is open (e.g. the Manual
// order sort button enabling after a reorder).
const INTERACTIVE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Viewport rects of every visible interactive element outside `exclude`
 * (the tooltip itself). Zero-size elements (hidden, collapsed) are ignored.
 */
export function collectInteractiveRects(
  exclude: Element | null,
): PlacementRect[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR),
  )
    .filter((el) => (exclude ? !exclude.contains(el) : true))
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0)
    .map((r) => ({ left: r.left, top: r.top, width: r.width, height: r.height }));
}
