/**
 * User preferences persisted across page reloads via localStorage.
 *
 * Each preference exposes an `is<Name>()` reader and a `toggle<Name>()`
 * mutator, modelled on the in-memory pattern in `sounds.tsx`. The shape
 * is intentionally simple — boolean flags only — so it can be hydrated
 * lazily at module load without any setup ceremony.
 */

const HIGH_VISIBILITY_KEY = "browslatro:highVisibility";
const MUTED_KEY = "browslatro:muted";

function readBoolean(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function writeBoolean(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, value ? "true" : "false");
  } catch {
    // Ignore — preference simply won't persist in environments without storage.
  }
}

let highVisibility = readBoolean(HIGH_VISIBILITY_KEY);
let muted = readBoolean(MUTED_KEY);

export function isHighVisibility(): boolean {
  return highVisibility;
}

export function toggleHighVisibility(): void {
  highVisibility = !highVisibility;
  writeBoolean(HIGH_VISIBILITY_KEY, highVisibility);
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): void {
  muted = !muted;
  writeBoolean(MUTED_KEY, muted);
}
