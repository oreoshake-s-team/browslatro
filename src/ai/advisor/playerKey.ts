export const PLAYER_KEY_STORAGE_KEY = "browslatro:advisor-player-key";

function storage(): Storage | null {
  return typeof localStorage === "undefined" ? null : localStorage;
}

export function readStoredPlayerKey(): string | null {
  const value = storage()?.getItem(PLAYER_KEY_STORAGE_KEY)?.trim();
  return value === undefined || value === "" ? null : value;
}

export function storePlayerKey(key: string): void {
  storage()?.setItem(PLAYER_KEY_STORAGE_KEY, key.trim());
}

export function clearPlayerKey(): void {
  storage()?.removeItem(PLAYER_KEY_STORAGE_KEY);
}

export function maskPlayerKey(key: string): string {
  if (key.length <= 11) return `…${key.slice(-2)}`;
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}
