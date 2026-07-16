import { isSerializedRun, type SerializedRun } from "./runSnapshot";
import { STORAGE_KEYS } from "../system/storageKeys";
import { getItem, setItem, removeItem } from "../system/safeStorage";

export const STORAGE_KEY = STORAGE_KEYS.runSnapshot;

export function loadSnapshot(): SerializedRun | null {
  const raw = getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isSerializedRun(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSnapshot(snapshot: SerializedRun): void {
  setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function clearSnapshot(): void {
  removeItem(STORAGE_KEY);
}
