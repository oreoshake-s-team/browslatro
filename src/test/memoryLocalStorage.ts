function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length(): number {
      return store.size;
    },
    clear(): void {
      store.clear();
    },
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value));
    },
  };
}

if (typeof globalThis.localStorage === "undefined") {
  const storage = createMemoryStorage();
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
    writable: true,
  });
  if (typeof (globalThis as { window?: unknown }).window === "undefined") {
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: storage },
      configurable: true,
      writable: true,
    });
  }
}
