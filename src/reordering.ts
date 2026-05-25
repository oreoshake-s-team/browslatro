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
