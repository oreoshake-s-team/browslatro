// Gap indices run 0..N where N = ids.length; gap K is "before item K" (and
// gap N is "after the last item"). Inserting source at gap K means the
// source ends up at index K after removal — except when K is to the right
// of source's old position, in which case the removal shifts the target
// index left by one. Gaps adjacent to the source (K === fromIdx or
// K === fromIdx + 1) are no-ops since the item would land where it already
// is; in that case (and when sourceId isn't found) the input array
// reference is returned unchanged so callers can skip a no-op update.
export function insertIdAtIndex<T>(
  ids: ReadonlyArray<T>,
  sourceId: T,
  destIndex: number,
): ReadonlyArray<T> {
  const fromIdx = ids.indexOf(sourceId);
  if (fromIdx < 0) return ids;
  if (destIndex === fromIdx || destIndex === fromIdx + 1) return ids;
  const next = ids.slice();
  next.splice(fromIdx, 1);
  const insertIdx = destIndex > fromIdx ? destIndex - 1 : destIndex;
  next.splice(insertIdx, 0, sourceId);
  return next;
}

export interface GapRect {
  readonly left: number;
  readonly width: number;
}

export function nearestGapIndex(
  rects: ReadonlyArray<GapRect>,
  clientX: number,
): number | null {
  let bestIdx: number | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  rects.forEach((rect, i) => {
    // jsdom returns zeroed rects for everything; skip resolving in that case
    // so unit tests can drive per-gap handlers directly without a container
    // handler clobbering their own gap-index calls.
    if (rect.width === 0 && rect.left === 0) return;
    const center = rect.left + rect.width / 2;
    const dist = Math.abs(clientX - center);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  });
  return bestIdx;
}
