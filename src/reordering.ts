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

export function nearestGapIndex(
  container: Element | null,
  clientX: number,
  gapSelector: string,
): number | null {
  if (!container) return null;
  const gaps = container.querySelectorAll<HTMLElement>(gapSelector);
  let bestIdx: number | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  gaps.forEach((gap, i) => {
    const rect = gap.getBoundingClientRect();
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
