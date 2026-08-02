const RENDER_PROFILING_KEY = "browslatro:renderProfiling";

export type RenderProfilerPhase = "mount" | "update" | "nested-update";

export interface RenderProfilingRecord {
  readonly id: string;
  readonly phase: RenderProfilerPhase;
  readonly actualDuration: number;
  readonly baseDuration: number;
  readonly startTime: number;
  readonly commitTime: number;
}

declare global {
  interface Window {
    __renderProfilingRecords?: RenderProfilingRecord[];
  }
}

// Candidate components are spread across separately lazy-loaded chunks
// (Shop, JokerStickerBadges, ...), each of which can get its own bundled
// copy of this module. A module-scoped array would fragment across those
// copies, so the accumulator lives on `window` — the one thing every chunk
// truly shares.
function store(): RenderProfilingRecord[] {
  return (window.__renderProfilingRecords ??= []);
}

export function isRenderProfilingEnabled(): boolean {
  try {
    return window.localStorage.getItem(RENDER_PROFILING_KEY) === "1";
  } catch {
    return false;
  }
}

export function recordRender(record: RenderProfilingRecord): void {
  store().push(record);
}

export function getRenderProfilingRecords(): ReadonlyArray<RenderProfilingRecord> {
  return store();
}

export function resetRenderProfilingRecords(): void {
  window.__renderProfilingRecords = [];
}
