import { isSerializedRun, type SerializedRun } from "./runSnapshot";

export const STORAGE_KEY = "browslatro:run:v1";

export function loadSnapshot(): SerializedRun | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSerializedRun(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSnapshot(snapshot: SerializedRun): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // quota exceeded or storage disabled — drop the save silently
  }
}

export function clearSnapshot(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
