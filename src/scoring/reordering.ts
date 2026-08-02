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
