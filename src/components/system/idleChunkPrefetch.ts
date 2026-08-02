interface NetworkInformationLike {
  readonly saveData?: boolean;
  readonly effectiveType?: string;
}

function shouldSkipPrefetch(): boolean {
  const connection = (navigator as Navigator & { connection?: NetworkInformationLike })
    .connection;
  if (connection === undefined) return false;
  if (connection.saveData === true) return true;
  return connection.effectiveType === "2g" || connection.effectiveType === "slow-2g";
}

function requestIdle(callback: () => void): void {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(callback);
    return;
  }
  window.setTimeout(callback, 200);
}

function pump(queue: Array<() => Promise<unknown>>): void {
  const importer = queue.shift();
  if (!importer) return;
  requestIdle(() => {
    importer()
      .catch(() => {})
      .finally(() => pump(queue));
  });
}

export function scheduleIdleChunkPrefetch(
  queue: ReadonlyArray<() => Promise<unknown>>,
): void {
  if (shouldSkipPrefetch()) return;
  pump([...queue]);
}
