/** Safe wrappers around localStorage — SSR-safe and quota-safe. */
export function getItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore quota or disabled storage
  }
}

export function removeItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function getBool(key: string): boolean {
  return getItem(key) === "1";
}

export function setBool(key: string, on: boolean): void {
  setItem(key, on ? "1" : "0");
}
